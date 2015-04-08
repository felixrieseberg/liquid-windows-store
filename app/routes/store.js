import Ember from 'ember';

export default Ember.Route.extend({
    model: function() {
        return this.store.find('app').then(function (result) {
            if (result) {
                return result.slice(10, 50);
            } else {
                return result;
            }
        });
    }
});
