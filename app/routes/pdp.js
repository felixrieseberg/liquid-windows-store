import Ember from 'ember';

export default Ember.Route.extend({
    model: function(params) {
        console.log('params', params);
        return this.store.find('app', params.app_id);
    }
});
