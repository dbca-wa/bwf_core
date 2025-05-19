# bwf_core
bwf_core is a Django app to build flexible, reusable workflows from a highlevel, that can be integrated with any other Django App.

## Quick start

1. Add "bwf_core" to your INSTALLED_APPS setting like this: 
```
INSTALLED_APPS = [
			...
			"bwf_core"
			]
```
2. Add the templates directory  to the TEMPLATE config
```
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "spatial_layer_monitor/templates",
            BASE_DIR / "bwf_core/templates",
        ],
        ...
    }]
```

  
3. Include the bwf_core URLconf in your project urls.py like this::
``path("bwf/", include("bwf_core.urls")),``

4. Run ``python manage.py migrate`` to create the models.
5. Start the development server and visit the admin to create a workflow.
---
### Routes
**Home:** Displays workflows and versions
> /bwf/dashboard

**Workflow Detail:** 
>/bwf/workflow/<int:workflow_id>/

**Workflow Edition:**
>/bwf/workflow/<int:workflow_id>/edit/<int:version_id>
---
### Core Plugins and more
``bwf_core``  will include inside its folder ``core_plugins`` the definition and execution of base plugins such as branches, loops, etc. However, the rest of plugins are expected to exist inside a sibling project, [bwf_components](https://github.com/dbca-wa/bwf_components)