import React from 'react';
import { withStyles } from '@mui/styles';

import WidgetDemoApp from '@iobroker/vis-2-widgets-react-dev/widgetDemoApp';
import { i18n as I18n } from '@iobroker/adapter-react-v5';

import translations from './translations';

import ConsumptionComparation from './ConsumptionComparation';
import Distribution from './Distribution';
import Consumption from './Consumption';
import IntervalSelector from './IntervalSelector';

const styles = theme => ({
    app: {
        backgroundColor: theme?.palette?.background.default,
        color: theme?.palette?.text.primary,
        height: '100%',
        width: '100%',
        overflow: 'auto',
        display: 'flex',
    },
});

class App extends WidgetDemoApp {
    constructor(props) {
        super(props);

        // init translations
        I18n.extendTranslations(translations);

        this.socket.registerConnectionHandler(this.onConnectionChanged);
    }

    onConnectionChanged = isConnected => {
        if (isConnected) {
            this.socket.getSystemConfig()
                .then(systemConfig => this.setState({ systemConfig }));
        }
    };

    renderWidget() {
        return <div className={this.props.classes.app}>
            <Distribution
                socket={this.socket}
                themeType={this.state.themeType}
                style={{
                    width: 600,
                    height: 650,
                }}
                systemConfig={this.state.systemConfig}
                data={{
                    name: 'Distribution',
                    oid: 'javascript.0.temperatureActual',
                    nodesCount: 3,
                    color1: 'rgba(155,211,134,1)',
                    range1: 10,
                    'g_level-1': true,
                    color2: 'rgba(30,24,68,1)',
                    range2: 2,
                    'g_level-2': true,
                    color3: 'rgba(199,194,220,1)',
                    range3: 6,
                    'g_level-3': true,
                    max: 30,
                    min: 12,
                }}
            />
            <ConsumptionComparation
                socket={this.socket}
                themeType={this.state.themeType}
                style={{
                    width: 600,
                    height: 650,
                }}
                systemConfig={this.state.systemConfig}
                data={{
                    name: 'ConsumptionComparation',
                    devicesCount: 2,
                    oid1: 'javascript.0.temperatureActual',
                    name1: 'temperatureActual',
                    color1: 'rgba(28,71,38,1)',
                    oid2: 'javascript.0.temperatureSet',
                    name2: 'temperatureSet',
                    color2: 'rgba(201,83,80,1)',
                }}
            />
            <Consumption
                socket={this.socket}
                themeType={this.state.themeType}
                style={{
                    width: 600,
                    height: 650,
                }}
                systemConfig={this.state.systemConfig}
                data={{
                    name: 'Consumption',
                    devicesCount: 2,
                    oid1: 'javascript.0.temperatureActual',
                    name1: 'temperatureActual',
                    color1: 'rgba(28,71,38,1)',
                    oid2: 'javascript.0.temperatureActual',
                    // oid2: 'info.0.sysinfo.memory.info.active',
                    name2: 'memory',
                    color2: 'rgba(201,83,80,1)',
                }}
            />
            <IntervalSelector
                socket={this.socket}
                themeType={this.state.themeType}
                style={{
                    width: 600,
                    height: 650,
                }}
                systemConfig={this.state.systemConfig}
                data={{
                    name: 'IntervalSelector',
                    oid: 'javascript.0.temperatureActual',
                    levelsCount: 3,
                    color1: 'rgba(155,211,134,1)',
                    range1: 10,
                    'g_level-1': true,
                    color2: 'rgba(30,24,68,1)',
                    range2: 2,
                    'g_level-2': true,
                    color3: 'rgba(199,194,220,1)',
                    range3: 6,
                    'g_level-3': true,
                    max: 30,
                    min: 12,
                }}
            />
        </div>;
    }
}

export default withStyles(styles)(App);
