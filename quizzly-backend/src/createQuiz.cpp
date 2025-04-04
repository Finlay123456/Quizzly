#include <iostream>
#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/uri.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/json.hpp>
#include "httplib.h" // Include httplib for API handling
#include "mongo_instance.h"

//mongocxx::instance instance{}; 

// Function to insert quiz into MongoDB
bool createQuiz(const std::string &jsonString) {
    try {
        // Initialize MongoDB
        mongocxx::uri uri("mongodb+srv://ngelbloo:jxdnXevSBkquhl2E@se3313-cluster.7kcvssw.mongodb.net/");
        mongocxx::client client(uri);

        // Get the database and collection
        auto db = client["Quiz_App_DB"];
        auto collection = db["Quizzes"];

        // Parse the incoming JSON string into BSON
        bsoncxx::document::value quizDoc = bsoncxx::from_json(jsonString);

        // Insert the document into the database
        auto result = collection.insert_one(quizDoc.view());

        // Return true if the insert was successful
        return result ? true : false;

    } catch (const std::exception &e) {
        std::cerr << "MongoDB Error: " << e.what() << std::endl;
        return false;
    }
}
