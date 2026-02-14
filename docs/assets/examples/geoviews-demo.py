import geoviews as gv
import geoviews.feature as gf

gv.extension("bokeh")

coastline = gf.coastline.opts(line_width=1.5)
borders = gf.borders.opts(line_color="gray", line_dash="dotted")
land = gf.land.opts(fill_color="#e8e8e8")
ocean = gf.ocean.opts(fill_color="#cce5ff")

world = ocean * land * coastline * borders
world.opts(width=700, height=400, title="World Map")
