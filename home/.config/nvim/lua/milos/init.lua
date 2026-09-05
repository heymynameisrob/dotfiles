local M = {}

function M.setup()
  vim.opt.termguicolors = true
  vim.g.colors_name = "milos"

  local palette = require("milos.palette")
  local groups = require("milos.highlights")(palette)

  for group, opts in pairs(groups) do
    vim.api.nvim_set_hl(0, group, opts)
  end
end

return M
