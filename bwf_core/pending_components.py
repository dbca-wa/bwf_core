

# Third-Party
import logging
from datetime import datetime
# Local
from bwf_core.models import ComponentInstance, ComponentStepStatusEnum
from .tasks import start_pending_component
logger = logging.getLogger(__name__)

class ProcessPendingComponents():

    def __init__(self):
        pass

    def run(self):
        
        current_datetime = datetime.now().astimezone()
        seen_datetime = datetime.strftime(current_datetime, '%Y-%m-%d %H:%M:%S')
        logger.info(f"Checking on pending Components {seen_datetime}")
        try:
            component_instances = ComponentInstance.objects.filter(status=ComponentStepStatusEnum.PENDING, created_at__lte=current_datetime).order_by('created_at')
            logger.info(f"Components to be checked on: {component_instances.count()}")
            for component_instance in component_instances:
                try:
                    start_pending_component(component_instance)
                except Exception as e:
                    logger.error(e)
        except Exception as e:
            logger.error(e)