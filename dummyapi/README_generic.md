# Generic Data API Service

This is a flexible and configurable API service that provides dummy data according to data structures defined in a JSON configuration file. The service offers REST API endpoints for HTTP requests and real-time updates via WebSockets or MQTT.

## Key Features

- **JSON-defined data structure**: Define your own data types, properties, and update behaviors
- **REST API endpoints**: Access data via standard HTTP requests
- **Real-time updates**: Get instant updates via WebSockets or MQTT
- **Configurable update rules**: Specify how each property should change over time
- **Dynamic web dashboard**: Visualize any data structure in real-time

## Configuration File

The `data_config.json` file defines the structure of your data:

```json
{
  "config": {
    "update_interval": 5,
    "default_status": "active"
  },
  "collections": [
    {
      "name": "collection_name",
      "items": [
        {
          "id": "item-001",
          "name": "Item Name",
          "property1": 123.45,
          "property2": "some value",
          "update_rules": {
            "property1": {
              "type": "random_float",
              "min_change": -1.0,
              "max_change": 1.0,
              "min_value": 100.0,
              "max_value": 150.0,
              "precision": 2
            }
          }
        }
      ]
    }
  ]
}
```

### Update Rule Types

The service supports the following update rule types:

1. **random_float**: Randomly change a float value within a specified range
   - `min_change`: Minimum change amount (can be negative)
   - `max_change`: Maximum change amount
   - `min_value`: Minimum allowed value
   - `max_value`: Maximum allowed value
   - `precision`: Number of decimal places

2. **random_int**: Randomly change an integer value within a specified range
   - `min_change`: Minimum change amount (can be negative)
   - `max_change`: Maximum change amount
   - `min_value`: Minimum allowed value
   - `max_value`: Maximum allowed value

3. **random_choice**: Randomly select from a list of options
   - `choices`: Array of possible values

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/generic-data-api.git
   cd generic-data-api
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   
   For WebSocket implementation:
   ```bash
   pip install -r requirements.txt
   ```
   
   For MQTT implementation:
   ```bash
   pip install -r mqtt-requirements.txt
   ```

## Running the Service

1. Ensure your `data_config.json` file is in the same directory as the application

2. Start the WebSocket version:
   ```bash
   python app.py
   ```

   Or the MQTT version (requires an MQTT broker):
   ```bash
   python mqtt_app.py
   ```

3. Open the web dashboard:
   ```
   http://localhost:5000/
   ```

## API Endpoints

- `GET /api/collections`: List all available collections
- `GET /api/collections/<collection_name>`: Get all items in a specific collection
- `GET /api/collections/<collection_name>/<item_id>`: Get a specific item by ID
- `GET /api/collections/<collection_name>/type/<type_value>`: Get items by type
- `GET /api/schema`: Get the current data schema

## WebSocket Events

- `data_update`: Event emitted when data is updated
- `connect`: Client connection event
- `disconnect`: Client disconnection event
- `start_background`: Event to trigger the background update task

## MQTT Topics

- `data/all`: All data in a single message
- `data/<collection_name>`: All items in a specific collection
- `data/<collection_name>/<item_id>`: Individual item data

## Extending the Service

You can easily extend this service by:

1. **Adding new data types**: Define new collections in `data_config.json`
2. **Creating custom update rules**: Add new rule types in the `update_data()` function
3. **Implementing authentication**: Add auth middleware to protect endpoints
4. **Adding persistence**: Store data in a database instead of memory
5. **Creating custom visualizations**: Modify the HTML dashboard for specific data types

## Example Data Types

The provided configuration includes sample data for:

1. **Sensors**: Temperature, humidity, and pressure sensors
2. **Stocks**: Stock prices with random fluctuations
3. **Weather**: Weather conditions for different cities

Feel free to modify these or add your own data types!

## License

This project is licensed under the MIT License.
