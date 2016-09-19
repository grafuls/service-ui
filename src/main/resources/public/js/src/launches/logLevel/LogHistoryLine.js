/*
 * Copyright 2016 EPAM Systems
 *
 *
 * This file is part of EPAM Report Portal.
 * https://github.com/epam/ReportPortal
 *
 * Report Portal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Report Portal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Report Portal.  If not, see <http://www.gnu.org/licenses/>.
 */
define(function (require, exports, module) {
    'use strict';

    var $ = require('jquery');
    var _ = require('underscore');
    var Backbone = require('backbone');
    var Epoxy = require('backbone-epoxy');
    var Service = require('coreService');
    var LaunchSuiteStepItemModel = require('launches/common/LaunchSuiteStepItemModel');
    var Util = require('util');


    var LogHistoryLineCollection = Backbone.Collection.extend({
        model: LaunchSuiteStepItemModel,

        initialize: function(options) {
            this.launchId = options.launchId
        },
        load: function(itemId) {
            var self = this;
            return Service.loadHistory(itemId)
                .done(function(data) {
                    self.reset(self.parse(data, itemId));
                })
        },
        parse: function(data, itemId) {
            var self = this;
            return  _.map(data, function(item) {
                var answer = {launchNumber: item.launchNumber};
                if(item.launchId == self.launchId) {
                    _.each(item.resources, function(resource) {
                        if(resource.id == itemId) {
                            answer = _.extend(answer, self.updateDataForModel(resource));
                        }
                    })
                } else if(item.resources.length == 1){
                    answer = _.extend(answer, self.model.parseData(item.resources[0]));
                } else if(item.resources.length == 0) {
                    answer.status = 'NOT_FOUND';
                } else {
                    answer.status = 'MANY';
                }
                return answer;
            })
        },
        updateDataForModel: function(data) {
            if(data.issue) {
                data.issue = JSON.stringify(data.issue);
            }
            if(data.tags) {
                data.tags = JSON.stringify(data.tags);
            }
            return data;
        }
    });

    var LogHistoryLineItemView = Epoxy.View.extend({
        template: 'tpl-launch-log-history-line-item',
        className: 'history-line-item',

        bindings: {
            '[data-js-launch-number]': 'text: launchNumber',
        },

        initialize: function() {
            this.render();
        },

        render: function() {
            this.$el.html(Util.templates(this.template, this.model.toJSON()));
        }
    });

    var LogHistoryLineView = Epoxy.View.extend({
        template: 'tpl-launch-log-history-line',
        initialize: function(options) {
            this.collectionItems = options.collectionItems;
            this.launchModel = options.launchModel;
            this.renderedItems = [];
            this.$el = options.$el;
            this.collection = new LogHistoryLineCollection({launchId: this.launchModel.get('id')});
            this.listenTo(this.collection, 'reset', this.onResetHistoryItems);
            this.render();
            var self = this;
            this.collection.load(this.collectionItems.getInfoLog().item)
                .always(function() {
                    self.trigger('load:history');
                })
        },
        render: function() {
            this.$el.html(Util.templates(this.template, {}));
        },
        onResetHistoryItems: function() {
            var $itemsContainer = $('[data-js-history-container]', this.$el);
            var self = this;
            _.each(this.collection.models, function(model) {
                var item = new LogHistoryLineItemView({model: model});
                $itemsContainer.append(item.$el);
                self.renderedItems.push(item);
            })
        },
        destroy: function () {
            while(this.renderedItems.length) {
                this.renderedItems.pop().destroy();
            }
            this.undelegateEvents();
            this.stopListening();
            this.unbind();
            this.$el.remove();
            delete this;
        },
    })

    return LogHistoryLineView;
});