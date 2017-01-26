import { createSelector } from 'reselect';
import { NODE_BASE_SIZE } from '../constants/styles';


const layoutNodesSelector = (state, _) => state.layoutNodes;
const stateWidthSelector = (state, _) => state.width;
const stateHeightSelector = (state, _) => state.height;
const propsMarginsSelector = (_, props) => props.margins;
const topologyIdSelector = (_, props) => props.topologyId;
const cachedZoomStateSelector = (state, props) => state.zoomCache[props.topologyId];

const viewportWidthSelector = createSelector(
  [
    stateWidthSelector,
    propsMarginsSelector,
  ],
  (width, margins) => width - margins.left - margins.right
);
const viewportHeightSelector = createSelector(
  [
    stateHeightSelector,
    propsMarginsSelector,
  ],
  (height, margins) => height - margins.top - margins.bottom
);

const defaultZoomSelector = createSelector(
  [
    layoutNodesSelector,
    viewportWidthSelector,
    viewportHeightSelector,
    propsMarginsSelector,
  ],
  (layoutNodes, width, height, margins) => {
    if (layoutNodes.size === 0) {
      return {};
    }

    const xMin = layoutNodes.minBy(n => n.get('x')).get('x');
    const xMax = layoutNodes.maxBy(n => n.get('x')).get('x');
    const yMin = layoutNodes.minBy(n => n.get('y')).get('y');
    const yMax = layoutNodes.maxBy(n => n.get('y')).get('y');

    const xFactor = width / (xMax - xMin);
    const yFactor = height / (yMax - yMin);
    const scale = Math.min(xFactor, yFactor);

    const translateX = (width - ((xMax + xMin) * scale)) / 2;
    const translateY = (height - ((yMax + yMin) * scale)) / 2;

    return {
      scale,
      minScale: scale / 5,
      maxScale: Math.min(width, height) / NODE_BASE_SIZE / 3,
      panTranslateX: translateX + margins.left,
      panTranslateY: translateY + margins.top,
    };
  }
);

export const restoredZoomState = createSelector(
  [
    cachedZoomStateSelector,
    defaultZoomSelector,
  ],
  (cachedZoomState, defaultZoomState) => cachedZoomState || defaultZoomState
);
