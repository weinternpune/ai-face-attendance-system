import asyncio
from app.database import get_database, connect_to_mongo

async def check_current_geofence():
    await connect_to_mongo()
    db = get_database()
    fences = await db.geofences.find({}).to_list(10)
    print("=== CURRENT OFFICE GEOFENCE LOCATIONS IN DB ===")
    for f in fences:
        print(f"Name: {f.get('name')}")
        print(f"Latitude: {f.get('latitude')}")
        print(f"Longitude: {f.get('longitude')}")
        print(f"Radius: {f.get('radius_meters')} meters")
        print(f"Address: {f.get('address')}")
        print(f"Is Active: {f.get('is_active')}")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(check_current_geofence())
