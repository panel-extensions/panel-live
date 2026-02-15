--[[
  panel-live Quarto extension

  Transforms `{.panel-live}` (and `{.panel}`) code blocks into
  `<panel-live>` HTML elements for interactive Panel apps in the browser.

  JS/CSS assets are bundled with the extension (built via `pixi run -e quarto`
  tasks). Version configuration via YAML document metadata:

    panel-live:
      pyodide-version: "v0.28.2"
      panel-version: "1.8.7"
      bokeh-version: "3.8.2"
      mini-coi: true  # inject mini-coi.js service worker (default: true)
]]

-- Track whether base JS/CSS has been injected
local base_setup_done = false

-- Document metadata, captured by the Meta filter
local doc_meta = nil

-- Known attributes that map to HTML attributes on <panel-live>
local known_attrs = {
  ["mode"] = true,
  ["theme"] = true,
  ["height"] = true,
  ["layout"] = true,
  ["auto-run"] = true,
  ["label"] = true,
  ["code-visibility"] = true,
  ["code-position"] = true,
  ["src"] = true,
  ["pre-render"] = true,
}

--- Escape HTML special characters.
local function escape_html(text)
  text = text:gsub("&", "&amp;")
  text = text:gsub("<", "&lt;")
  text = text:gsub(">", "&gt;")
  text = text:gsub('"', "&quot;")
  return text
end

--- Parse `#|` directives from code block text.
-- Returns a table of key-value pairs and the cleaned code.
local function parse_directives(code)
  local directives = {}
  local code_lines = {}
  for line in code:gmatch("([^\n]*)\n?") do
    local key, value = line:match("^#|%s*(%S+):%s*(.*)")
    if key then
      -- Trim whitespace from value
      value = value:match("^%s*(.-)%s*$")
      directives[key] = value
    else
      table.insert(code_lines, line)
    end
  end
  -- Remove trailing empty line if present
  while #code_lines > 0 and code_lines[#code_lines] == "" do
    table.remove(code_lines)
  end
  return directives, table.concat(code_lines, "\n")
end

--- Get panel-live configuration from document metadata.
local function get_config(meta)
  local conf = {}
  local pl_meta = meta and meta["panel-live"]
  if pl_meta then
    for k, v in pairs(pl_meta) do
      if type(v) == "boolean" then
        conf[k] = v
      elseif type(v) == "string" then
        conf[k] = v
      elseif type(v) == "table" then
        conf[k] = pandoc.utils.stringify(v)
      end
    end
  end
  return conf
end

--- Inject panel-live JS/CSS and config into the document.
local function ensure_base_setup(meta)
  if base_setup_done then
    return
  end
  base_setup_done = true

  local conf = get_config(meta)

  -- Register local JS/CSS assets via Quarto's dependency system.
  -- Files are bundled with the extension (copied by _quarto-sync-assets).
  -- Quarto copies them to site_libs/panel-live-{version}/ and resolves
  -- paths correctly for nested pages.
  quarto.doc.add_html_dependency({
    name = "panel-live",
    version = "0.0.1",
    scripts = { "panel-live.js" },
    stylesheets = { "panel-live.css" },
    resources = { { name = "panel-live-worker.js", path = "panel-live-worker.js" } },
  })

  -- Build PANEL_LIVE_CONFIG
  local config_parts = {}
  if conf["pyodide-version"] then
    table.insert(config_parts,
      string.format('"pyodideVersion": "%s"', conf["pyodide-version"]))
  end
  if conf["panel-version"] then
    table.insert(config_parts,
      string.format('"panelVersion": "%s"', conf["panel-version"]))
  end
  if conf["bokeh-version"] then
    table.insert(config_parts,
      string.format('"bokehVersion": "%s"', conf["bokeh-version"]))
  end
  if conf["panel-cdn"] then
    table.insert(config_parts,
      string.format('"panelCdn": "%s"', conf["panel-cdn"]))
  end
  if conf["bokeh-cdn"] then
    table.insert(config_parts,
      string.format('"bokehCdn": "%s"', conf["bokeh-cdn"]))
  end

  -- Inject dynamic config and mini-coi via raw <script> tags (these
  -- cannot use add_html_dependency since they are inline/special).
  local head_parts = {}

  -- mini-coi.js service worker for COOP/COEP headers (Pyodide SharedArrayBuffer).
  -- Needed on hosts like GitHub Pages where custom HTTP headers cannot be set.
  -- Default: true. Set `mini-coi: false` in metadata to disable.
  local mini_coi = conf["mini-coi"]
  if mini_coi == nil then
    mini_coi = true
  end

  if mini_coi then
    -- Copy mini-coi.js to the site output root via serviceworkers so the
    -- service worker scope covers the entire site.
    quarto.doc.add_html_dependency({
      name = "panel-live-coi",
      version = "0.0.1",
      serviceworkers = { "mini-coi.js" },
    })
    table.insert(head_parts,
      '<script src="mini-coi.js" type="module"></script>')
  end

  if #config_parts > 0 then
    table.insert(head_parts, string.format(
      '<script>window.PANEL_LIVE_CONFIG = {%s};</script>',
      table.concat(config_parts, ", ")
    ))
  end

  if #head_parts > 0 then
    quarto.doc.include_text("in-header", table.concat(head_parts, "\n"))
  end
end

--- Meta filter: capture document metadata before CodeBlock runs.
local function Meta(meta)
  doc_meta = meta
  return nil
end

--- Main CodeBlock filter for panel-live code blocks.
local function CodeBlock(el)
  -- Match 'panel-live' or 'panel' class
  local is_panel_live = el.classes:includes("panel-live")
    or el.classes:includes("panel")

  if not is_panel_live then
    return nil
  end

  -- Only transform for HTML output
  if not quarto.doc.is_format("html") then
    return nil
  end

  -- Inject base JS/CSS
  ensure_base_setup(doc_meta)

  -- Parse #| directives from code
  local directives, clean_code = parse_directives(el.text)

  -- Build HTML attributes
  local attrs = {}
  for key, _ in pairs(known_attrs) do
    local value = directives[key] or el.attributes[key]
    if value and value ~= "" then
      table.insert(attrs, string.format(' %s="%s"', key, escape_html(value)))
    end
  end

  -- Handle requirements
  local requirements = directives["requirements"] or el.attributes["requirements"]
  if requirements and requirements ~= "" then
    table.insert(attrs, string.format(' data-requirements="%s"', escape_html(requirements)))
  end

  local attr_str = table.concat(attrs)

  -- Build the <panel-live> element
  local html
  if clean_code and clean_code ~= "" then
    html = string.format(
      "<panel-live%s>\n%s\n</panel-live>",
      attr_str, escape_html(clean_code)
    )
  else
    html = string.format("<panel-live%s></panel-live>", attr_str)
  end

  return pandoc.RawBlock("html", html)
end

-- Return two filter passes: first capture metadata, then transform code blocks.
-- Within a single pass, Pandoc visits Block elements before Meta, so they
-- must be in separate passes to ensure doc_meta is set before CodeBlock runs.
return {
  { Meta = Meta },
  { CodeBlock = CodeBlock },
}
