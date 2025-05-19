============
bwf_core
============

bwf_core is a Django app to build flexible, reusable workflows from a highlevel,
that can be integrated with any other Django App.

Quick start
-----------

1. Add "bwf_core" to your INSTALLED_APPS setting like this::

    INSTALLED_APPS = [
        ...,
        "bwf_core",
    ]

2. Include the polls URLconf in your project urls.py like this::

    path("bwf_core/", include("bwf_core.urls")),

3. Run ``python manage.py migrate`` to create the models.

4. Start the development server and visit the admin to create a workflow.
