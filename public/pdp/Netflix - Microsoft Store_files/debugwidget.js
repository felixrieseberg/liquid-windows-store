$(function() {
    var speed = 'fast';

    var link = $('.srv_debug-widget-LinkDiv');
    var frame = $('.srv_debug-widget-frame');

    link.click(function () {
        frame.show(speed);
        link.hide(speed);
    });

    $('.debug-widget-frame .close-button').click(function () {
        frame.hide(speed);
        link.show(speed);
    });
});