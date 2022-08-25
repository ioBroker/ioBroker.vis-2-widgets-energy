import React from 'react';
import PropTypes from 'prop-types';

// Icon copied from https://www.flaticon.com/free-icon/electrical-tower_100567 (license ioBroker GmbH)
// https://www.flaticon.com/free-icons/power, Copyright Power icons created by Freepik - Flaticon
const IconLeaf = props => <svg
    onClick={e => props.onClick && props.onClick(e)}
    viewBox="0 0 24 24"
    width={props.width || 20}
    height={props.height || props.width || 20}
    xmlns="http://www.w3.org/2000/svg"
    className={props.className}
    style={props.style}
>
    <path
        fill="currentColor"
        d="M12 3c-4.8 0-9 3.86-9 9 0 2.12.74 4.07 1.97 5.61L3 19.59 4.41 21l1.97-1.97C7.93 20.26 9.88 21 12 21c2.3 0 4.61-.88 6.36-2.64C20.12 16.61 21 14.3 21 12V3h-9zm3.83 9.26-5.16 4.63c-.16.15-.41.14-.56-.01-.14-.14-.16-.36-.04-.52l2.44-3.33-4.05-.4c-.44-.04-.63-.59-.3-.89l5.16-4.63c.16-.15.41-.14.56.01.14.14.16.36.04.52l-2.44 3.33 4.05.4c.45.04.63.59.3.89z"
    />
</svg>;

IconLeaf.propTypes = {
    onClick: PropTypes.func,
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    className: PropTypes.string,
};
export default IconLeaf;
