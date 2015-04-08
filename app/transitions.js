export default function () {
    this.transition(
        this.fromRoute('store'),
        this.toRoute('pdp'),
        this.use('toRight'),
        this.reverse('toLeft')
    );
    this.transition(
        this.matchSelector('.cli_image'),
        this.use('toUp')
    );
}