const makeFederation = require('@iobroker/vis-2-widgets-react-dev/modulefederation.config');

module.exports = makeFederation(
    'vis2energyWidgets',
    {
        './ConsumptionComparation': './src/ConsumptionComparation',
        './Consumption': './src/Consumption',
        './IntervalSelector': './src/IntervalSelector',
        './Distribution': './src/Distribution',
        './translations': './src/translations',
    }
);