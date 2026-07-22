# Generic Data API with GeoJSON Support

This project provides a flexible and configurable API service that delivers dynamic data according to structures defined in a JSON configuration file. The service includes built-in support for geospatial data using the GeoJSON format, making it ideal for mapping and location-based applications.

## Key Features

- **JSON-defined data structure**: Define your own data types, properties, and update behaviors
- **GeoJSON support**: Built-in handling for geographical data like points, lines, and polygons
- **REST API endpoints**: Access data via standard HTTP requests
- **Real-time updates**: Get instant updates via WebSockets or MQTT
- **Configurable update rules**: Specify how each property should change over time
- **Dynamic dashboard**: Visualize any data structure in real-time, including maps
- **Specialized GeoJSON endpoints**: Access data in standard GeoJSON format for mapping libraries

## GeoJSON Support

The API now supports GeoJSON data types out of the box, with specialized update rules for:

- **Vessel/vehicle movement**: Simulate realistic movement with speed and heading
- **Traffic conditions**: Generate random traffic congestion and incidents
- **Geographic points**: Represent locations with latitude and longitude
- **Route/path data**: Define LineString geometries for roads, routes, etc.

## Configuration File

The `data_config.json` file defines the structure of your data, including GeoJSON collections:

```json
{
  "config": {
    "update_interval": 5
  },
  "collections": [
    {
      "name": "vessels",
      "type": "geojson",
      "items": [
        {
          "id": "vessel-001",
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [-122.4194, 37.7749]
          },
          "properties": {
            "name": "Cargo Ship Alpha",
            "vesselType": "cargo",
            "speed": 15.5,
            "heading": 90,
            "update_rules": {
              "geometry.coordinates": {
                "type": "geo_movement",
                "speed_knots": 15.5
              }
            }
          }
        }
      ]
    }
  ]
}
```

### GeoJSON Update Rule Types

The service supports specialized update rules for geospatial data:

1. **geo_movement**: Simulate movement of points based on speed and heading
   - `speed_knots`: Base speed in knots
   - `heading_variation`: Maximum random variation in heading (degrees)
   - `speed_variation`: Maximum random variation in speed
   - `bounds`: Geographical bounds [minLon, minLat, maxLon, maxLat]

2. **random_incidents**: Generate random incidents for roads or areas
   - `probability`: Chance (0-1) of generating a new incident
   - `max_incidents`: Maximum number of incidents at one time
   - `types`: Array of possible incident types

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
   ```bash
   pip install -r requirements.txt
   ```

## Running the Service

1. Ensure your `data_config.json` file is configured with your desired data structure

2. Start the service:
   ```bash
   python app.py
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
- `GET /api/geojson/<collection_name>`: Get a collection as a standard GeoJSON FeatureCollection
- `GET /api/schema`: Get the current data schema

## Dashboard Features

The included web dashboard provides:

1. **Data view**: Displays all collections and items in an organized card layout
2. **Map view**: Visualizes geospatial data on an interactive map
3. **Real-time updates**: All data and the map update in real-time via WebSockets
4. **Interactive elements**: Popups, tooltips, and controls for exploring the data

## Use Cases

This API is ideal for:

1. **Development and testing**: Provide realistic, dynamic data for application development
2. **Demonstrations and prototypes**: Showcase application capabilities with simulated data
3. **Education**: Learn about APIs, WebSockets, and geospatial data
4. **Simulations**: Create simulated environments for training or testing systems
5. **Mapping applications**: Provide dynamic GeoJSON data for maps and spatial visualization

## Extending the Service

You can easily extend this service by:

1. **Adding new GeoJSON feature types**: Add polygons or multi-geometries to represent complex areas
2. **Creating custom update rules**: Add new rule types in the `update_data()` function
3. **Adding temporal data**: Extend with time-based patterns or historical data
4. **Implementing authentication**: Add auth middleware to protect endpoints
5. **Adding persistence**: Store data in a geospatial database like PostGIS

## License

This project is licensed under the MIT License.