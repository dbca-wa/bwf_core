import logging

logger = logging.getLogger(__name__)

class PluginNotFoundException(Exception):
    def __init__(self, message):
        message = "Plugin not found: " + message
        logger.error(message)
        super().__init__(message)

class WorkflowMissingRequiredInputs(Exception):
    def __init__(self, message, label= ""):
        message = f"Workflow missing required inputs [{label}]: " + message
        logger.error(message)
        super().__init__(message)

class ComponentInputsEvaluationException(Exception):
    def __init__(self, message, label):
        message = f"Component inputs evaluation exception [{label}]: " + message
        logger.error(message)
        super().__init__(message)

class ComponentExecutionException(Exception):
    def __init__(self, message, component_id):
        message = f"Component execution exception [{component_id}]: " + message
        logger.error(message)
        super().__init__(message)