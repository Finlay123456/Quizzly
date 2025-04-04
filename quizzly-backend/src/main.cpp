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
// Replace in your code
const std::string MONGODB_URI = 
    "mongodb+srv://ngelbloo:" 
    "jxdnXevSBkquhl2E"  // URL-encode any special characters if present
    "@se3313-cluster.7kcvssw.mongodb.net/"
    "?retryWrites=true"
    "&w=majority"
    "&appName=QuizApp"
    "&serverSelectionTimeoutMS=10000";  // Add timeout

std::string generate_lobby_code() {
    static const char alphanum[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    std::string code;
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> distrib(0, sizeof(alphanum) - 2);

    for (int i = 0; i < 6; ++i) {
        code += alphanum[distrib(gen)];
    }
    return code;
}

struct GameLobby {
    std::string id;
    std::string quiz_id;
    std::string host_id;
    std::set<std::string> player_ids;
    std::set<std::shared_ptr<websocket::stream<tcp::socket>>> sockets;
    std::mutex mutex;
    
    void broadcast(const std::string& message) {
        std::lock_guard<std::mutex> lock(mutex);
        for(auto& socket : sockets) {
            socket->write(net::buffer(message));
        }
    }
};

class LobbyManager {
public:
    std::shared_ptr<GameLobby> create_lobby(const std::string& quiz_id, const std::string& host_id) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto lobby = std::make_shared<GameLobby>();
        lobby->id = generate_lobby_code();
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
                        auto player_ws = std::make_shared<websocket::stream<tcp::socket>>(std::move(ws));
                        {
                            std::lock_guard<std::mutex> lock(lobby->mutex);
                            lobby->player_ids.insert(user_id);
                            lobby->sockets.insert(player_ws);
                        }

                        // Update MongoDB
                        try {
                            mongocxx::client client{mongocxx::uri{MONGODB_URI}};
                            client["Quiz_App_DB"]["Lobbies"].update_one(
                                bsoncxx::builder::stream::document{} 
                                    << "_id" << lobby_id 
                                    << bsoncxx::builder::stream::finalize,
                                bsoncxx::builder::stream::document{} 
                                    << "$addToSet" << bsoncxx::builder::stream::open_document
                                        << "players" << user_id 
                                    << bsoncxx::builder::stream::close_document
                                    << "$inc" << bsoncxx::builder::stream::open_document
                                        << "player_count" << 1 
                                    << bsoncxx::builder::stream::close_document 
                                    << bsoncxx::builder::stream::finalize
                            );
                        } catch(const std::exception& e) {
                            std::cerr << "DB update error: " << e.what() << std::endl;
                        }

                        // Broadcast update
                        auto response = bsoncxx::builder::stream::document{}
                            << "action" << "player_joined"
                            << "lobby_id" << lobby_id
                            << "player_count" << static_cast<int>(lobby->player_ids.size())
                            << "players" << bsoncxx::builder::stream::open_array
                                << [&](bsoncxx::builder::stream::array_context<> arr) {
                                    for (const auto& pid : lobby->player_ids) {
                                        arr << pid;
                                    }
                                }
                            << bsoncxx::builder::stream::close_array
                            << bsoncxx::builder::stream::finalize;
                        
                        lobby->broadcast(bsoncxx::to_json(response));

                        // Keep connection alive
                        try {
                            while(true) {
                                beast::flat_buffer loop_buffer;
                                player_ws->read(loop_buffer);
                            }
                        } catch(const beast::system_error& se) {
                            if(se.code() == websocket::error::closed) {
                                std::lock_guard<std::mutex> lock(lobby->mutex);
                                lobby->player_ids.erase(user_id);
                                lobby->sockets.erase(player_ws);

                                // Update MongoDB on disconnect
                                try {
                                    mongocxx::client client{mongocxx::uri{MONGODB_URI}};
                                    client["Quiz_App_DB"]["Lobbies"].update_one(
                                        bsoncxx::builder::stream::document{} 
                                            << "_id" << lobby_id 
                                            << bsoncxx::builder::stream::finalize,
                                        bsoncxx::builder::stream::document{} 
                                            << "$pull" << bsoncxx::builder::stream::open_document
                                                << "players" << user_id 
                                            << bsoncxx::builder::stream::close_document
                                            << "$inc" << bsoncxx::builder::stream::open_document
                                                << "player_count" << -1 
                                            << bsoncxx::builder::stream::close_document 
                                            << bsoncxx::builder::stream::finalize
                                    );
                                } catch(const std::exception& e) {
                                    std::cerr << "DB update error: " << e.what() << std::endl;
                                }

                                auto leave_response = bsoncxx::builder::stream::document{}
                                    << "action" << "player_left"
                                    << "lobby_id" << lobby_id
                                    << "player_count" << static_cast<int>(lobby->player_ids.size())
                                    << "players" << bsoncxx::builder::stream::open_array
                                        << [&](bsoncxx::builder::stream::array_context<> arr) {
                                            for (const auto& pid : lobby->player_ids) {
                                                arr << pid;
                                            }
                                        }
                                    << bsoncxx::builder::stream::close_array
                                    << bsoncxx::builder::stream::finalize;
                                
                                lobby->broadcast(bsoncxx::to_json(leave_response));
                            }
                        }
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
    
    std::thread ws_thread([&lobby_manager]{
        run_websocket_server(lobby_manager, 9002);
    });

    httplib::Server svr;
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type"}
    });

    svr.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
        res.status = 200;
    });

    // Existing endpoints (keep your original implementations)
    // ...

    svr.Post("/api/lobbies", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            auto doc = bsoncxx::from_json(req.body);
            auto view = doc.view();
    
            std::string quiz_id{view["quiz_id"].get_string().value};
            std::string host_id{view["host_id"].get_string().value};
    
            auto lobby = lobby_manager.create_lobby(quiz_id, host_id);
    
            mongocxx::client client{mongocxx::uri{MONGODB_URI}};
            auto collection = client["Quiz_App_DB"]["Lobbies"];
    
            auto lobby_doc = bsoncxx::builder::stream::document{}
                << "_id" << lobby->id
                << "quiz_id" << quiz_id
                << "host_id" << host_id
                << "status" << "waiting"
                << "player_count" << 0
                << "players" << bsoncxx::builder::stream::open_array
                << bsoncxx::builder::stream::close_array
                << "created_at" << bsoncxx::types::b_date(std::chrono::system_clock::now())
                << bsoncxx::builder::stream::finalize;
    
            collection.insert_one(lobby_doc.view());
    
            auto response = bsoncxx::builder::stream::document{}
                << "success" << true
                << "lobby_id" << lobby->id
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

    svr.Get(R"(/api/lobbies/([A-Z0-9]{6}))", [&](const httplib::Request& req, httplib::Response& res) {
        try {
            std::string lobby_id = req.matches[1];
            mongocxx::client client{mongocxx::uri{MONGODB_URI}};
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