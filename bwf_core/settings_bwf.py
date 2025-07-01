from django.core.exceptions import ImproperlyConfigured
from django.contrib import messages
from django.conf import settings
from django.apps import apps

# from confy import env, database
import decouple
import os
from collections import OrderedDict
from pathlib import Path


# Project paths
# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = None
BASE_DIR_ENV = decouple.config("BASE_DIR", default=None)
if BASE_DIR_ENV is None:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
else:
    BASE_DIR = BASE_DIR_ENV
PROJECT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bwf_core"
)
PRIVATE_MEDIA_ROOT = decouple.config("PRIVATE_MEDIA_ROOT", default="bwf_private_media")
PROJECT_WORKING_DIR = os.getcwd()

""" 
   Here we modify the Installed_Apps list to include bwf_component plugins that have a models.py file.
"""
IGNORE_DIRS = ["__pycache__"]

BASE_PLUGIN_ROUTE = os.path.join(BASE_DIR, "bwf_components", "plugins")
if os.path.exists(BASE_PLUGIN_ROUTE) is False:
    BASE_PLUGIN_ROUTE = os.path.join(PROJECT_WORKING_DIR, "bwf_components", "plugins")
    if os.path.exists(BASE_PLUGIN_ROUTE) is False:
        import sys

        print("BWF Components module does not exist")
        sys.exit(1)

FLOW_NODES_ROUTE = os.path.join(BASE_DIR, "bwf_core", "core_plugins")

BWF_PLUGINS_APPS = [
    "bwf_forms",
]
PLUGIN_ROUTES = [BASE_PLUGIN_ROUTE, FLOW_NODES_ROUTE]
PLUGIN_TEMPLATE_ROUTES = []
for route in PLUGIN_ROUTES:
    is_bwf_componments = route == BASE_PLUGIN_ROUTE
    if not os.path.exists(route) or not os.path.isdir(route):
        continue
    for plugin in os.listdir(route):
        if not os.path.exists(route) or not os.path.isdir(route):
            continue
        plugin_path = os.path.join(route, plugin)
        if os.path.isdir(plugin_path) and not plugin in IGNORE_DIRS:
            models_path = os.path.join(plugin_path, "models.py")
            if os.path.exists(models_path):
                if is_bwf_componments:
                    BWF_PLUGINS_APPS.append(
                        f"bwf_components{plugin_path.split('bwf_components')[1]}".replace(
                            "/", "."
                        )
                    )
                    # Plugin template path
                    if os.path.exists(os.path.join(plugin_path, "templates")):
                        plugin_template_path = os.path.join(
                            plugin_path, "templates"
                        )
                        PLUGIN_TEMPLATE_ROUTES.append(plugin_template_path)
                else:
                    BWF_PLUGINS_APPS.append(
                        f"bwf_core{plugin_path.split('bwf_core')[1]}".replace("/", ".")
                    )

HAS_UPDATED_APPS = getattr(settings, "HAS_UPDATED_APPS", False)
if not HAS_UPDATED_APPS and len(BWF_PLUGINS_APPS) > 0:
    for plugin in BWF_PLUGINS_APPS:
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
"""
   End of Installed_Apps modification

   Start: Loading templates directories for BWF core and components.
"""

if not hasattr(settings, "TEMPLATES") or len(settings.TEMPLATES) == 0:
    raise ImproperlyConfigured("TEMPLATES setting is required in settings.py")

BWF_TEMPLATE_PATHS = [os.path.join(BASE_DIR, "bwf_components", "templates"),
                    os.path.join(BASE_DIR, "bwf_forms", "templates"),
                    os.path.join(BASE_DIR, "bwf_forms", "templates"),]

for plugin_template_path in PLUGIN_TEMPLATE_ROUTES + BWF_TEMPLATE_PATHS:
    if plugin_template_path not in settings.TEMPLATES[0]["DIRS"]:
        settings.TEMPLATES[0]["DIRS"] += [Path(plugin_template_path)]

"""
   End of loading templates directories for BWF core and components.

   Start: Loading static files directories for BWF components and plugins.
"""
if not hasattr(settings, "STATICFILES_DIRS"):
    raise ImproperlyConfigured("STATICFILES_DIRS setting is required in settings.py")

BWF_COMPONENTS_STATIC_DIRS = os.path.join(
    BASE_DIR, "bwf_components", "plugins", "*", "static"
)
BWF_FORMS_STATIC_DIR = os.path.join(BASE_DIR, "bwf_forms", "static")

if not BWF_FORMS_STATIC_DIR in settings.STATICFILES_DIRS:
    # Add the bwf_forms static files directory to the STATICFILES_DIRS setting
    settings.STATICFILES_DIRS += [BWF_FORMS_STATIC_DIR]

if not BWF_COMPONENTS_STATIC_DIRS in settings.STATICFILES_DIRS:
    # Add the static files directory to the STATICFILES_DIRS setting
    settings.STATICFILES_DIRS += [BWF_COMPONENTS_STATIC_DIRS]
"""
   End of loading static files directories for BWF components and plugins.
"""

if os.path.exists(os.path.join(BASE_DIR, "bwf_components", "bwf_components_context_processors.py")):
    settings.TEMPLATES[0]["OPTIONS"]["context_processors"] += [
        "bwf_components.bwf_components_context_processors.variables",
    ]


if os.path.exists(os.path.join(BASE_DIR, "bwf_forms", "settings_forms.py")):
    from bwf_forms import settings_forms
