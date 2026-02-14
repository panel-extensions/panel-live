import xarray as xr
import numpy as np

np.random.seed(42)
lats = np.arange(-90, 91, 30)
lons = np.arange(-180, 181, 60)
times = np.arange(4)

temperature = 15 + 25 * np.cos(np.deg2rad(lats))[:, None, None] + np.random.randn(len(lats), len(lons), len(times)) * 3

ds = xr.Dataset(
    {"temperature": (["lat", "lon", "time"], temperature)},
    coords={
        "lat": lats,
        "lon": lons,
        "time": times,
    },
    attrs={"title": "Synthetic Climate Data", "units": "degrees Celsius"},
)

ds
