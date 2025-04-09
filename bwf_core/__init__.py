import os
import sys

def django_manage():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bwf_core.settings_bwf")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
