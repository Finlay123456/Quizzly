#include <iostream>
#include <unordered_map>
#include <set>
#include <mutex>
#include <thread>
#include "httplib.h"
#include "createQuiz.h"
#include "register.h"
#include "editQuiz.h"
#include "login.h"
#include "getQuizzes.h"
#include "mongo_instance.h"
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <bsoncxx/json.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/oid.hpp>

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = net::ip::tcp;

mongocxx::instance instance{};

std::string generate_lobby_code() {
    static const char alphanum[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "0123456789";

    std::string code;
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> distrib(0, sizeof(alphanum) - 2);

    for (int i = 0; i < 6; ++i) {
        code += alphanum[distrib(gen)];
    }

    return code;
}

// Lobby structure and manager
struct GameLobby {
    std::string id;
    std::string quiz_id;
    std::string host_id;
    std::set<std::shared_ptr<websocket::stream<tcp::socket>>> players;
    std::mutex mutex;
    
    void broadcast(const std::string& message) {
        std::lock_guard<std::mutex> lock(mutex);
        for(auto& player : players) {
            player->write(net::buffer(message));
        }
    }
};

class LobbyManager {
    public:
        std::shared_ptr<GameLobby> create_lobby(const std::string& quiz_id, const std::string& host_id) {
            std::lock_guard<std::mutex> lock(mutex_);
            auto lobby = std::make_shared<GameLobby>();
            lobby->id = generate_lobby_code(); // <-- ✅ 6-digit code generated here
            lobby->quiz_id = quiz_id;
            lobby->host_id = host_id;
            lobbies_[lobby->id] = lobby;
            return lobby;
        }
    
        std::shared_ptr<GameLobby> get_lobby(const std::string& id) {
            std::lock_guard<std::mutex> lock(mutex_);
            auto it = lobbies_.find(id);
            return (it != lobbies_.end()) ? it->second : nullptr;
        }
    
    private:
        std::mutex mutex_;
        std::unordered_map<std::string, std::shared_ptr<GameLobby>> lobbies_;
    };
// WebSocket server implementation
void run_websocket_server(LobbyManager& lobby_manager, unsigned short port) {
    try {
        net::io_context ioc{1};
        tcp::acceptor acceptor{ioc, {tcp::v4(), port}};

        while(true) {
            tcp::socket socket{ioc};
            acceptor.accept(socket);

            std::thread([&lobby_manager, socket = std::move(socket)]() mutable {
                try {
                    websocket::stream<tcp::socket> ws{std::move(socket)};
                    ws.accept();

                    beast::flat_buffer buffer;
                    ws.read(buffer);
                    
                    auto doc = bsoncxx::from_json(beast::buffers_to_string(buffer.data()));
                    auto view = doc.view();
                    
                    std::string lobby_id{view["lobby_id"].get_string().value};
                    std::string user_id{view["user_id"].get_string().value};
                    std::string action{view["action"].get_string().value};

                    auto lobby = lobby_manager.get_lobby(lobby_id);
                    if(!lobby) {
                        ws.close(websocket::close_code::normal);
                        return;
                    }

                    if(action == "join") {
                        std::lock_guard<std::mutex> lock(lobby->mutex);
                        lobby->players.insert(std::make_shared<websocket::stream<tcp::socket>>(std::move(ws)));
                        
                        // Notify all players
                        auto response = bsoncxx::builder::stream::document{}
                            << "action" << "player_joined"
                            << "lobby_id" << lobby_id
                            << "player_count" << static_cast<int>(lobby->players.size())
                            << bsoncxx::builder::stream::finalize;
                        
                        lobby->broadcast(bsoncxx::to_json(response));
                    }
                } 
                catch(const std::exception& e) {
                    std::cerr << "WebSocket error: " << e.what() << std::endl;
                }
            }).detach();
        }
    } 
    catch(const std::exception& e) {
        std::cerr << "WebSocket server error: " << e.what() << std::endl;
    }
}

int main() {
    LobbyManager lobby_manager;
    
    // Start WebSocket server
    std::thread ws_thread([&lobby_manager]{
        run_websocket_server(lobby_manager, 9002);
    });

    httplib::Server svr;

    // Set CORS headers
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type"}
    });

    // Handle OPTIONS requests
    svr.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
        res.status = 200;
    });

    // Existing endpoints
    svr.Get("/api/data", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(R"({"message": "Hello from C++ Backend!"})", "application/json");
    });

    svr.Get("/api/quizzes", [](const httplib::Request&, httplib::Response& res) {
        std::string quizzes = getAllQuizzes();
        res.set_content(quizzes, "application/json");
    });

    svr.Post("/api/create-quiz", [](const httplib::Request& req, httplib::Response& res) {
        bool success = createQuiz(req.body);
        std::string jsonResponse = success 
            ? R"({"success": true})" 
            : R"({"success": false, "error": "Failed to create quiz"})";
        res.set_content(jsonResponse, "application/json");
    });

    svr.Post("/api/register", [](const httplib::Request& req, httplib::Response& res) {
        bool success = registerUser(req.body);
        std::string jsonResponse = success 
            ? R"({"success": true})" 
            : R"({"success": false, "error": "Failed to register user"})";
        res.set_content(jsonResponse, "application/json");
    });

    svr.Get(R"(/api/quiz/id/([a-f0-9]{24}))", [](const httplib::Request& req, httplib::Response& res) {
        std::string quizId = req.matches[1];
        try {
            mongocxx::client client{mongocxx::uri{"mongodb+srv://ngelbloo:jxdnXevSBkquhl2E@se3313-cluster.7kcvssw.mongodb.net/"}};
            auto collection = client["Quiz_App_DB"]["Quizzes"];
            bsoncxx::oid oid(quizId);
            auto result = collection.find_one(bsoncxx::builder::stream::document{} 
                << "_id" << oid 
                << bsoncxx::builder::stream::finalize);

            if(result) {
                res.set_content(R"({"success": true, "quiz": )" + bsoncxx::to_json(result->view()) + "}", "application/json");
            } else {
                res.set_content(R"({"success": false, "error": "Quiz not found"})", "application/json");
            }
        } 
        catch(const std::exception& e) {
            res.set_content(std::string(R"({"success": false, "error": ")") + e.what() + R"("})", "application/json");
        }
    });

    svr.Put("/api/edit-quiz", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto doc = bsoncxx::from_json(req.body);
            auto view = doc.view();
            
            if(!view["id"] && !view["_id"]) {
                res.set_content(R"({"success": false, "error": "Missing quiz ID"})", "application/json");
                return;
            }
            
            bool success = updateQuiz(req.body);
            res.set_content(success 
                ? R"({"success": true})" 
                : R"({"success": false, "error": "Update failed"})", "application/json");
        } 
        catch(const std::exception& e) {
            res.set_content(std::string(R"({"success": false, "error": ")") + e.what() + R"("})", "application/json");
        }
    });

    svr.Post("/api/login", [](const httplib::Request& req, httplib::Response& res) {
        bool success = loginUser(req.body);
        std::string jsonResponse = success 
            ? R"({"success": true})" 
            : R"({"success": false, "error": "Failed to login"})";
        res.set_content(jsonResponse, "application/json");
    });

    svr.Post("/api/lobbies", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            auto doc = bsoncxx::from_json(req.body);
            auto view = doc.view();
    
            std::string quiz_id{view["quiz_id"].get_string().value};
            std::string host_id{view["host_id"].get_string().value};
    
            auto lobby = lobby_manager.create_lobby(quiz_id, host_id); // Generates 6-digit code (BQZMGK)
    
            mongocxx::client client{mongocxx::uri{"mongodb+srv://ngelbloo:jxdnXevSBkquhl2E@se3313-cluster.7kcvssw.mongodb.net/?retryWrites=true&w=majority"}};
            auto collection = client["Quiz_App_DB"]["Lobbies"];
    
            auto lobby_doc = bsoncxx::builder::stream::document{}
                << "_id" << lobby->id            // 🧠 6-digit code AS the Mongo _id
                << "quiz_id" << quiz_id
                << "host_id" << host_id
                << "status" << "waiting"
                << "created_at" << bsoncxx::types::b_date(std::chrono::system_clock::now())
                << bsoncxx::builder::stream::finalize;
    
            collection.insert_one(lobby_doc.view());
    
            auto response = bsoncxx::builder::stream::document{}
                << "success" << true
                << "lobby_id" << lobby->id  // Return the 6-digit code to frontend
                << bsoncxx::builder::stream::finalize;
    
            res.set_content(bsoncxx::to_json(response), "application/json");
        }
        catch (const std::exception& e) {
            auto error = bsoncxx::builder::stream::document{}
                << "success" << false
                << "error" << e.what()
                << bsoncxx::builder::stream::finalize;
            res.set_content(bsoncxx::to_json(error), "application/json");
        }
    });
    

    // 🧠 Fetch lobby by 6-character game code
svr.Get(R"(/api/lobbies/([A-Z0-9]{6}))", [&](const httplib::Request& req, httplib::Response& res) {
    try {
        std::string lobby_id = req.matches[1];
        
        mongocxx::client client{mongocxx::uri{"mongodb+srv://ngelbloo:jxdnXevSBkquhl2E@se3313-cluster.7kcvssw.mongodb.net/?retryWrites=true&w=majority"}};
        auto collection = client["Quiz_App_DB"]["Lobbies"];

        auto result = collection.find_one(bsoncxx::builder::stream::document{}
            << "_id" << lobby_id
            << bsoncxx::builder::stream::finalize);

        if (result) {
            res.set_content(bsoncxx::to_json(result->view()), "application/json");
        } else {
            res.status = 404;
            res.set_content(R"({"success": false, "error": "Lobby not found"})", "application/json");
        }
    }
    catch (const std::exception& e) {
        res.status = 500;
        res.set_content(std::string(R"({"success": false, "error": ")") + e.what() + R"("})", "application/json");
    }
});


    std::cout << "HTTP Server running on http://localhost:5001\n";
    std::cout << "WebSocket Server running on ws://localhost:9002\n";
    
    svr.listen("0.0.0.0", 5001);
    ws_thread.join();
    return 0;
}