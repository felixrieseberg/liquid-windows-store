export default function () {
    var duration = 300;

    this.transition(
        this.fromRoute('store'),
        this.toRoute('pdp'),
        this.use('explode', {
            matchBy: 'data-app-id',
            use: ['flyTo', {
                duration
            }]
        }, {
            use: ['toLeft', {
                duration
            }]
        }),
        this.reverse('explode', {
            matchBy: 'data-app-id',
            use: ['flyTo', {
                duration
            }]
        }, {
            use: ['toRight', {
                duration
            }]
        })
    );

    this.transition(
        this.childOf('.appicons'),
        this.use('explode', {
            matchBy: 'data-app-id',
            use: ['flyTo', {
                duration, easing: [250, 15]
            }]
        })
    );
}