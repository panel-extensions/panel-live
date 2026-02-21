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
      mini-coi: true    # inject mini-coi.js service worker (default: true)
      pre-render: true   # pre-render code at build time (default: false)
      setup-code: ""     # Python code prepended before each block
      cache-dir: ".panel-live"  # cache directory for pre-rendered output
]]

-- Track whether base JS/CSS has been injected
local base_setup_done = false

-- Document metadata, captured by the Meta filter
local doc_meta = nil

-- Known attributes that map to HTML attributes on <panel-live>
-- NOTE: "pre-render" is NOT included here because it is a build-time
-- directive, not an HTML attribute.
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
  ["preview"] = true,
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

--- Pre-render Panel code by calling the panel-live CLI.
-- Returns the JSON string on success, or nil on failure.
local function pre_render_code(code, conf)
  local cache_dir = conf["cache-dir"] or ".panel-live"
  local setup_code = conf["setup-code"] or ""

  -- Build the CLI arguments
  local args = { "-m", "panel_live", "pre-render",
                 "--cache-dir", cache_dir }
  if setup_code ~= "" then
    table.insert(args, "--setup-code")
    table.insert(args, setup_code)
  end

  -- pandoc.pipe(command, args, input) sends input on stdin and returns stdout.
  -- The CLI reads code from the positional argument, so we pass it as the last arg.
  table.insert(args, code)

  local ok, result = pcall(pandoc.pipe, "python", args, "")
  if ok and result and result ~= "" then
    -- Trim trailing whitespace/newlines
    result = result:match("^(.-)%s*$")
    if result ~= "" then
      return result
    end
  else
    if not ok then
      io.stderr:write("[panel-live] pre-render failed: " .. tostring(result) .. "\n")
    else
      io.stderr:write("[panel-live] pre-render produced no output\n")
    end
  end
  return nil
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
      '<script src="mini-coi.js"></script>')
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

  -- Apply default-auto-run from metadata (if auto-run not set per-block)
  local conf = get_config(doc_meta)
  if not directives["auto-run"] and not el.attributes["auto-run"] then
    local default_auto_run = conf["default-auto-run"]
    if default_auto_run ~= nil then
      local val = "false"
      if default_auto_run == true or default_auto_run == "true" then
        val = "true"
      end
      table.insert(attrs, string.format(' auto-run="%s"', val))
    end
  end

  -- Handle requirements
  local requirements = directives["requirements"] or el.attributes["requirements"]
  if requirements and requirements ~= "" then
    table.insert(attrs, string.format(' data-requirements="%s"', escape_html(requirements)))
  end

  local attr_str = table.concat(attrs)

  -- Pre-render if enabled (per-block directive overrides global config)
  local pre_rendered_html = ""
  local pre_render_opt = directives["pre-render"]
  local should_prerender
  if pre_render_opt == "true" then
    should_prerender = true
  elseif pre_render_opt == "false" then
    should_prerender = false
  else
    -- Fall back to global config (default: false)
    local global_pr = conf["pre-render"]
    should_prerender = (global_pr == true or global_pr == "true")
  end

  if should_prerender and clean_code and clean_code ~= "" then
    local json_output = pre_render_code(clean_code, conf)
    if json_output then
      pre_rendered_html = "\n" .. string.format(
        '<script type="application/json" class="panel-live-prerender">%s</script>',
        json_output
      )
    end
  end

  -- Build the <panel-live> element
  local html
  if clean_code and clean_code ~= "" then
    html = string.format(
      "<panel-live%s>\n%s%s\n</panel-live>",
      attr_str, escape_html(clean_code), pre_rendered_html
    )
  else
    html = string.format("<panel-live%s>%s</panel-live>", attr_str, pre_rendered_html)
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
