"""Allow running panel-live as ``python -m panel_live``."""

import sys

from panel_live.cli import main

sys.exit(main())
