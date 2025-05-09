from django.core.exceptions import ImproperlyConfigured
from django.contrib import messages
from django.conf import settings
from django.apps import apps

# from confy import env, database
import decouple
import os
from collections import OrderedDict


# Project paths
# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = None
BASE_DIR_ENV = decouple.config('BASE_DIR',default=None)
if BASE_DIR_ENV is None:
   BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
else:
   BASE_DIR = BASE_DIR_ENV
PROJECT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bwf_core')
PRIVATE_MEDIA_ROOT = decouple.config("PRIVATE_MEDIA_ROOT", default="bwf_private_media")

''' 
   Here we modify the Installed_Apps list to include bwf_component plugins that have a models.py file.
'''
IGNORE_DIRS = ['__pycache__']

BASE_PLUGIN_ROUTE = os.path.join(BASE_DIR, 'bwf_components', 'plugins')
FLOW_NODES_ROUTE = os.path.join(BASE_DIR, 'bwf_core', 'core_plugins')

plugins = []
PLUGIN_ROUTES = [BASE_PLUGIN_ROUTE, FLOW_NODES_ROUTE]

for route in PLUGIN_ROUTES:
   is_bwf_componments = route == BASE_PLUGIN_ROUTE
   if not os.path.exists(route) or not os.path.isdir(route):
         continue
   for plugin in os.listdir(route):
         if not os.path.exists(route) or not os.path.isdir(route):
            continue
         plugin_path = os.path.join(route, plugin)
         if os.path.isdir(plugin_path) and not plugin in IGNORE_DIRS:
            models_path = os.path.join(plugin_path, 'models.py')
            if os.path.exists(models_path):
               if is_bwf_componments:
                  plugins.append(f"bwf_components{plugin_path.split('bwf_components')[1]}".replace("/","."))
               else:
                  plugins.append(f"bwf_core{plugin_path.split('bwf_core')[1]}".replace("/","."))

HAS_UPDATED_APPS = getattr(settings, 'HAS_UPDATED_APPS', False)
if not HAS_UPDATED_APPS and len(plugins) > 0:
   for plugin in plugins:
      if plugin not in settings.INSTALLED_APPS:
         settings.INSTALLED_APPS.append(plugin)
         print(f"Added {plugin} to INSTALLED_APPS")
      else:
         print(f"{plugin} already in INSTALLED_APPS")
   apps.app_configs = OrderedDict()
   apps.apps_ready = apps.models_ready = apps.loading = apps.ready = False
   apps.clear_cache()
   apps.populate(settings.INSTALLED_APPS)
# Set the environment variable to indicate that the apps have been updated
settings.HAS_UPDATED_APPS = True
'''
   End of Installed_Apps modification
'''

