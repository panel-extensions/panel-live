# GeoViews

World map with coastlines, borders, and land/ocean fill using GeoViews feature elements.

**Why it fails:** GeoViews depends on [Cartopy](https://scitools.org.uk/cartopy/), which was removed from Pyodide in v0.28.0 due to build issues. Cartopy v0.24.1 was available in Pyodide v0.27.0 but is no longer included. The Pyodide team states these packages will be re-enabled when build issues are resolved. See [Pyodide 0.28 release notes](https://blog.pyodide.org/posts/0.28-release/).

Docs: [GeoViews](https://geoviews.org/)

```{.panel mode="editor" src="../../../assets/examples/geoviews-demo.py" auto-run="true" label="Python" code-position="last"}
```
