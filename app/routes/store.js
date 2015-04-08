import Ember from 'ember';
import ResetScroll from '../mixins/reset-scroll';

export default Ember.Route.extend(ResetScroll, {
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
