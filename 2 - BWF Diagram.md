## Workflow Diagram
### Front end 
#### `components.js` 
It holds access to the controller of the GUI representation of a workflow diagram. 
The `workflow_components` object is responsible for:
	- fetching all the components
	- Render the components
	- Render the lines (routes)
	- Add functionality to the nodes: 
		- Draggability
		- Open on the side bar
		- Create a Node and render it into the diagram
	- Rendering a node's data inside the side panel:
		- Render controls for node edition
		- Render fields using the `value_selector` plugin
		- Render the routing items and their controls

Maybe some of this functionality could be separated to improve the coding experience. e.g. separating the side panel rendering functions into a feature-specific file.


#### `value_selector.js` 
 This plugin is responsible for individually rendering the controls of a field. 
 Some examples of these funcitonalities are: 
 - Render the editable text field for Inputs with a string _data type_
 - Render the edition buttons based on a read-only condition, if the workflow is an active version. 
 - Render the text editor (_code mirror_) for expressions such as javascript or python. 
 - Render the controls of a Conditional value (_is_condition_)

 **Input Fields**
 Input fields in components have a structure like 

|**Field**|**Description**|
|---|---|
|`key`|The internal identifier for the field; in this case, it's `"url"`.|
|`label`|The user-facing label or display name of the field, shown in the UI as `"URL"`.|
|`type`|Specifies the expected data type for the field; here, it's a string.|
|`value`|The current or default value for the field; an empty string means no input yet.|
|`required`|Indicates whether the field must be filled out; `true` means it's mandatory.|

This structure is commonly used in form generators or configuration schemas to define how a field should behave and appear. Let me know if you'd like to see how a whole form definition might look with multiple fields like this.
 