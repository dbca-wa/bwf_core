"""Spatial Layer Monitor Management Command."""


# Third-Party
import logging
from django.core.management import base
# Local
from bwf_core.pending_components import ProcessPendingComponents
logger = logging.getLogger(__name__)


class Command(base.BaseCommand):
    """Run Pending Tasks Command."""
    # Help string
    help = "Processes Spatial Layers Monitor"  # noqa: A003

    def handle(self, *args, **kwargs) -> None:
        """Handles the management command functionality."""
        # Display information
        self.stdout.write("Processing pending components...")
        ProcessPendingComponents().run()

