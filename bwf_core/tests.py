from django.test import TestCase

# Create your tests here.



class BWFCoreTests(TestCase):


    pass



# Test create component

# Test create workflow

# Test create workflow version

# Test set active workflow version 

# TEST UTILS

class BWFCoreUtilsTests(TestCase):

    def test_generate_workflow_definition(self):
        from bwf_core.workflow.utils import generate_workflow_definition

        name = "Test Workflow"
        description = "This is a test workflow."
        version = "1.0.0"

        definition = generate_workflow_definition(name, description, version)

        self.assertEqual(definition['name'], name)
        self.assertEqual(definition['description'], description)
        self.assertEqual(definition['version'], version)
        self.assertIn('workflow', definition)
        self.assertIn('mapping', definition)
        self.assertIn('inputs', definition)
        self.assertIn('variables', definition)

# Test set active workflow version

# Test eval inputs
# Test calculate next node
# Test adjust_workflow_routing
# eval_conditional_expression
