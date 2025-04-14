var common_entity_modal = { 
    var: {
        type: "submit",
        fields: [],
        field_map: {},
    },
    init: function(title, type="submit"){
        $('#common-entity-modal-table').hide();
        $('#common-entity-modal-error').hide();
        $('#common-entity-modal-label').text(title);
        if(type=="submit"){
            $('#common-entity-modal-submit-btn').show();
            $('#common-entity-modal-delete-btn').hide();
            $('#common-entity-modal-cancel-btn').show();
        } else if(type=="delete"){
            $('#common-entity-modal-submit-btn').hide();
            $('#common-entity-modal-delete-btn').show();
            $('#common-entity-modal-cancel-btn').show();
        } else if(type="info"){
            $('#common-entity-modal-submit-btn').hide();
            $('#common-entity-modal-delete-btn').hide();
            $('#common-entity-modal-cancel-btn').hide();
        }
        this.var.type = type;

        // remove all previous fields
        $('#common-entity-modal-content').empty();
        common_entity_modal.set_all_disabled(false);
    },
    add_field: function(label_str, type="text", value=null, option_map={}, disabled=false){
        let contents = $('#common-entity-modal-content');
        
        //label
        let label = null;
        if(type != "button"){
            label = $('<label>').text(label_str);
            contents.append(label);
        }
        
        //field
        disabled = common_entity_modal.var.type == "delete" ? true: disabled;
        let field = this.maker[type](label_str, value, disabled, option_map);
        contents.append(field);
        const id = this.get_id(field, type);
        common_entity_modal.register_field(field, label, id);
        return id;
    },
    register_field: function(field, label, id){
        common_entity_modal.var.fields.push(field);
        common_entity_modal.var.field_map[id] = {field:field, label:label};
        return id;
    },
    add_div: function(label_str, div, labels_fields=[]){
        let contents = $('#common-entity-modal-content');
        //label
        const label = $('<label>').text(label_str);
        contents.append(label);

        contents.append(div);

        this.add_labels_fields(labels_fields);
    },
    // labels_fields = [{label:label_obj, field:field_obj}] 
    add_labels_fields: function(labels_fields=[]){
        for(let i in labels_fields){
            const field = labels_fields[i].field;
            const label = labels_fields[i].label;
            common_entity_modal.var.fields.push(field);
            common_entity_modal.var.field_map[this.get_id(field)] = {field:field, label:label};
        }
    },
    init_talbe: function(){
        $('#modal-table thead').empty();
        $('#modal-table tbody').empty();
        this.get_limit().off('change');
        this.get_limit().val("10");
        this.get_search().val("");
        $('#common-entity-modal-table').show();
    },
    maker: {
        make_common_field: (label, value, disabled, type="text", element="<input>") => {
            let field = $(element);
            field.attr("type", type);
            field.attr("class", "form-control");
            field.attr("id", "common-entity-modal-"+label.replace(/[^a-zA-Z0-1]/g, ' ').replaceAll(' ', '-').toLowerCase());
            if(value != null) 
                field.val(value);
            if (disabled) 
                field.prop("disabled", true);
            return field;
        },
        text: (label, value, disabled) => {
            value = value == null ? "" : value;
            return common_entity_modal.maker.make_common_field(label, value, disabled);
        },
        password: (label, value, disabled) => {
            value = value ? value: "";
            return common_entity_modal.maker.make_common_field(label, value, disabled, type="password");
        },
        text_area: (label, value, disabled) => {
            let field = common_entity_modal.maker.make_common_field(label, value, disabled, type="text", element="<textarea>");
            field.height('150px');
            return field;
            // <textarea class="form-control" id="exampleFormControlTextarea1" rows="3"></textarea>
        },
        number: (label, value, disabled) => {
            value = value == null ? "" : value;
            let field = common_entity_modal.maker.make_common_field(label, value, disabled, type="number");
            field.on('input',function(){
                $(this).val($(this).val().replace(/\D/g, ""));
            });
            return field;
        },
        email: (label, value, disabled) => {
            return common_entity_modal.maker.make_common_field(label, value=value, disabled, type="email");
        },
        select: (label, value, disabled, option_map) => {
            let field = common_entity_modal.maker.make_common_field(label, value, disabled, type="text", element="<select>");
            field.append('<option value="" selected disabled>Select</option>');
            for(let key in option_map)
                field.append('<option value="'+key+'">'+option_map[key]+'</option>');       
            field.val(value);
            return field;

        },
        switch: (label, value, disabled) => {
            let div = $('<div>');
            div.attr("class", "form-check form-switch");

            value = value != null ? value: true;
            let field = common_entity_modal.maker.make_common_field(label, value, disabled, type="checkbox", element="<input>");
            field.attr("role", "switch");
            field.attr("class", "form-check-input");
            field.prop('checked', value);

            div.append(field);
            return div;
        },
        empty: () => {  // is this being used?
            let div = $('<div>');
            div.attr('id', 'modal-table');
            return div;
        },
        div: () => {
            let div = $('<div>');
            div.attr('id', 'modal-div');
            div.attr('class', 'col-12');
            return div;
        },
        label: (label_str, id) => {
            let label = $('<label>').text(label_str);
            if(id){
                label.attr('id', '');
            }
        },
        button: (btn_str, value, disabled) => {
            let btn = $('<button>').text(btn_str);
            btn.attr('class', 'btn btn-primary');
            btn.attr("id", "common-entity-modal-btn-"+btn_str.replace(/[^a-zA-Z0-1]/g, ' ').replaceAll(' ', '-').toLowerCase());
            if (disabled) 
                btn.prop("disabled", true);
            return btn
        },
    },
    get_id: function(element, type){
        if(!element.is('div') || (element.is('div') && type == 'empty')){
            return element.attr("id");
        } else if(element.is('div')){
            let children = element.children();
            for(let i in children){
                let res = this.get_id($(children[i]));
                if(res)
                    return res; 
            }
        }
        return null
    },
    add_callbacks: function(submit_callback, success_callback){
        let error_handler = (error)=>{
            common_entity_modal.roll_all_disabilities_back(false);
            if('status' in error){
                let error_obj = JSON.parse(error.responseText);
                let msg;
                for(let key in error_obj)
                    msg = JSON.stringify(error_obj[key]);
                common_entity_modal.show_error_modal(msg);
            }
            else
                common_entity_modal.show_error_modal(error.message);
        };
        
        let callback_with_close = () =>{
            common_entity_modal.set_all_disabled(true);
            try{
                submit_callback(
                    (response)=>{   //success_callback
                            if(success_callback){
                                success_callback(response);
                            }
                            common_entity_modal.hide();
                        },
                        error_handler); //error callback
                }catch(error){
                    error_handler(error);
                }
        };
        $('#common-entity-modal-submit-btn').off('click');
        $('#common-entity-modal-delete-btn').off('click');
        if(this.var.type == 'submit'){
            $('#common-entity-modal-submit-btn').click(callback_with_close);
        } else if (this.var.type == 'delete'){
            $('#common-entity-modal-delete-btn').click(callback_with_close);
        }
    },
    show_error_modal: function(error){
        $('#common-entity-modal-error').text(error);
        $('#common-entity-modal-error').show();
        console.log(error);
    },
    show: function(){
        common_entity_modal.hide_all_modal('entity');
        common_entity_modal.show_modal($('#common-entity-modal'));
    },
    get_thead: function(){
        return $('#modal-table-thead');
    },
    get_tbody: function(){
        return $('#modal-table-tbody');
    },
    get_limit: function(){
        console.log('in get_limit')
        return $('#modal-table-limit');
    },
    get_search: function(){
        return $('#modal-table-search');
    },
    get_page_navi: function(){
        return $('#modal-table-page-navi');
    },
    change_disabled: function (ids){
        ids = Array.isArray(ids) ? ids : [ids];
        for(let i in ids){
            id = ids[i];
            const disabled = $('#'+id).prop("disabled");
            $('#'+id).prop("disabled", !disabled);
        }
    },
    set_all_disabled: function(disabled){
        common_entity_modal.var.disabilities = {}
        for(let i in common_entity_modal.var.fields){
            const id = common_entity_modal.var.fields[i].attr("id");
            const disability = common_entity_modal.var.fields[i].prop("disabled");
            common_entity_modal.var.disabilities[id] = disability;
            common_entity_modal.var.fields[i].prop("disabled", disabled);
        }
        const btn_submit = $('#common-entity-modal-submit-btn');
        const btn_cancel = $('#common-entity-modal-cancel-btn');
        const btn_delete = $('#common-entity-modal-delete-btn');

        common_entity_modal.var.disabilities[btn_submit.attr("id")] = btn_submit.prop("disabled");
        common_entity_modal.var.disabilities[btn_cancel.attr("id")] = btn_cancel.prop("disabled");
        common_entity_modal.var.disabilities[btn_delete.attr("id")] = btn_delete.prop("disabled");
        btn_submit.prop("disabled", disabled);
        btn_cancel.prop("disabled", disabled);
        btn_delete.prop("disabled", disabled);
    },
    roll_all_disabilities_back: function(){
        for(let id in common_entity_modal.var.disabilities){
            $('#'+id).prop("disabled", common_entity_modal.var.disabilities[id]);
        }
    },
    show_alert: function (content, title){
        common_entity_modal.hide_all_modal('alert');
        if(title){
            $('#common-alert-modal-label').text(title);
        }
        $('#common-alert-modal-content').text(content);
        common_entity_modal.show_modal($('#common-alert-modal'));
    },
    show_progress: function (){
        common_entity_modal.hide_all_modal('progress');
        common_entity_modal.show_modal($('#common-progress-modal'));
    },
    show_modal: function (modal){
        modal.off('shown.bs.modal');
        modal.modal('show');
    },
    hide: function(){
        common_entity_modal.hide_modal($('#common-entity-modal'));
    },
    hide_alert: function(){
        common_entity_modal.hide_modal($('#common-alert-modal'));
    },
    hide_progress: function (){
        common_entity_modal.hide_modal($('#common-progress-modal'));
    },
    hide_modal: function(modal){
        modal.on('shown.bs.modal', ()=>modal.modal('hide'));
        modal.modal('hide');
    },
    hide_all_modal: function (current){
        if(current != 'entity'){
            common_entity_modal.hide();
        }
        if(current != 'alert'){
            common_entity_modal.hide_alert();
        }
        if(current != 'progress'){
            common_entity_modal.hide_progress();
        }
    },
    hide_entity: function (id){
        common_entity_modal.var.field_map[id].field.hide();
        common_entity_modal.var.field_map[id].label.hide();
    },
    show_entity: function (id){
        common_entity_modal.var.field_map[id].field.show();
        common_entity_modal.var.field_map[id].label.show();
    },
    change_label: function (id, label){
        common_entity_modal.var.field_map[id].label.text(label);
    },
    get_label: function (id){
        return common_entity_modal.var.field_map[id].label.text();
    },
}

