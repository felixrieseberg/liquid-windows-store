import DS from 'ember-data';

export default DS.Model.extend({
    DisplayPrice: DS.attr('string'),
    ImageSource: DS.attr('string'),
    InlineStyle: DS.attr(),
    Price: DS.attr(),
    Rating: DS.attr(),
    Title: DS.attr('string'),
    Type: DS.attr(),
    SlotId: DS.attr('string'),
    Usage: DS.attr()
});