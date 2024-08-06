import PropTypes from 'prop-types';

class Generic extends window.visRxWidget {
    getPropertyValue = state => this.state.values[`${this.state.rxData[state]}.val`];

    // eslint-disable-next-line class-methods-use-this
    static getI18nPrefix() {
        return 'vis_2_widgets_energy_';
    }
}

Generic.propTypes = {
    socket: PropTypes.object,
    themeType: PropTypes.string,
    style: PropTypes.object,
    data: PropTypes.object,
};

export default Generic;
