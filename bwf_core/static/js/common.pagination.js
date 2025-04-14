var common_pagination = {
    var: {
        max_showon_pages: 9,  // Maximum number of page buttons to show
        current_page: 0
    },
    init: function(entry_count, params, get_page, navi) {
        let limit = +params.limit;
        let total = Math.ceil(entry_count / limit);
        let range = this.make_page_range(this.var.current_page, total, this.var.max_showon_pages);
        let beginning = range.beginning;
        let end = range.end;

        let navi_obj = this.make_btn_html(common_pagination.var.current_page, total, beginning, end);
        navi.html(navi_obj.navi_html);
        let existingDirectNavi = navi.next('#direct_navi_html');
        if (existingDirectNavi.length > 0){
            existingDirectNavi.replaceWith(navi_obj.direct_navi_html)
        } else {
            navi.after(navi_obj.direct_navi_html)
        }

        let set_btn_event = function(id, page_number) {
            $(id).off('click').on('click', function(event) {
                event.preventDefault();
                common_pagination.var.current_page = page_number;
                params.limit = limit;
                params.offset = page_number * limit;
                let params_str = utils.make_query_params(params);
                get_page(params_str);
            });
        }

        for (let i = beginning; i < end; i++) {
            set_btn_event('#paging_btn_' + (i + 1), i);
        }

        // prev and next buttons
        set_btn_event('#paging_btn_prev', common_pagination.var.current_page - 1);
        set_btn_event('#paging_btn_next', common_pagination.var.current_page + 1);
        
        // first and last page buttons
        if (beginning > 0) {
            set_btn_event('#paging_btn_1', 0);
        }
        if (end < total) {
            set_btn_event('#paging_btn_' + total, total - 1);
        }

        // set event for page number input
        this.set_page_input_event(params, get_page, limit, total);
    },
    make_page_btn_html: function(id, text, status) {
        var html = '<li class="page-item{disabled1}{current1}"{current2}><a class="page-link" href="#" id="'+id+'"{disabled2}>'+text+'</a></li>'
        if (status == 'disabled') {
            html = html.replace("{disabled1}", ' disabled');
            html = html.replace("{disabled2}", ' aria-disabled="true"');
        }
        if (status == 'current') {
            html = html.replace("{current1}", ' active');
            html = html.replace("{current2}", ' aria-current="page"');
        }
        html = html.replace(/{disabled1}|{disabled2}|{current1}|{current2}/g, '');
        return html;
    },
    make_page_range: function(current, total, max_shown) {
        var beginning = 0;  // 0 means page 1
        let page_over = total > max_shown;
        var end = page_over ? max_shown : total;

        // Adjust for large number of pages
        if (page_over) {
            if (current < Math.floor(max_shown / 2)) {
                beginning = 0;
                end = max_shown;
            } else if (current > total - Math.ceil(max_shown / 2)) {
                beginning = total - max_shown;
                end = total;
            } else {
                beginning = current - Math.floor(max_shown / 2);
                end = current + Math.ceil(max_shown / 2);
            }
        }

        // Include ellipses where appropriate
        return {
            beginning: beginning,
            end: end,
            show_start_ellipsis: beginning > 1,
            show_end_ellipsis: end < total - 1
        };
    },
    make_btn_html: function(current, total, beginning, end) {
        var prev_status = (current == 0) ? "disabled" : null;
        var next_status = (current + 1 >= total) ? "disabled" : null;
        var navi_html = "";

        navi_html += this.make_page_btn_html("paging_btn_prev", "Previous", prev_status);

        if (beginning > 0) {
            navi_html += this.make_page_btn_html('paging_btn_1', '1', (current === 0) ? 'current' : null);
            if (beginning > 1){
                navi_html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        for (let i = beginning; i < end; i++) {
            var status = (i == current) ? 'current' : null;
            navi_html += this.make_page_btn_html('paging_btn_' + (i + 1), (i + 1), status);
        }

        if (end < total) {
            if (end < total - 1){
                navi_html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            navi_html += this.make_page_btn_html('paging_btn_' + total, total, (current + 1 === total) ? 'current' : null);
        }

        navi_html += this.make_page_btn_html("paging_btn_next", "Next", next_status);
        
        // Add input for direct page navigation
        let direct_navi_html = ''
        if ((beginning > 1) || (end < total - 1)){
            direct_navi_html = `
                <div id="direct_navi_html">
                    <ul class="pagination justify-content-end">
                        <li class="page-item disabled">
                            <span class="page-link">Go to page</span>
                        </li>
                        <li class="page-item">
                            <input type="number" id="page_number_input" class="form-control" style="width: 60px;" min="1" max="${total}" value="${current + 1}">
                        </li>
                        <li class="page-item">
                            <button id="page_number_go" class="btn btn-primary">Go</button>
                        </li>
                    </ul>
                </div>
            `;
        }

        return {
            navi_html: navi_html,
            direct_navi_html: direct_navi_html
        };
    },
    set_page_input_event: function(params, get_page, limit, total) {
        $('#page_number_go').off('click').on('click', function(event) {
            event.preventDefault();
            let page_number = parseInt($('#page_number_input').val(), 10);
            if (isNaN(page_number) || page_number < 1 || page_number > total) {
                alert("Invalid page number.");
                return;
            }
            common_pagination.var.current_page = page_number - 1;
            params.limit = limit;
            params.offset = common_pagination.var.current_page * limit;
            let params_str = utils.make_query_params(params);
            get_page(params_str);
        });
    }
};

