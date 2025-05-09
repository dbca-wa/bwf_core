from django.apps import AppConfig


class BwfComponentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = 'bwf_core'
    verbose_name = "Business Workflow Components"

    # def ready(self):
    #     from bwf_core.controller.controller import BWFPluginController
    #     BWFPluginController.get_instance().load_plugins()
    #     return super().ready()

