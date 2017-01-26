import { createSelector } from 'reselect';
import { NODE_BASE_SIZE } from '../constants/styles';


const layoutNodesSelector = state => state.layoutNodes;
const stateWidthSelector = state => state.width;
const stateHeightSelector = state => state.height;
const propsMarginsSelector = (_, props) => props.margins;
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

// Compute the default zoom settings for the given graph layout
// that, when applied, put the graph in the center of viewport,
// with a zoom factor set so that the the graph would cover 80%
// of the viewport along the dimension in which it spans more.
// Minimum zoom factor is always set to be 1/5 of that while
// the maximum zoom is always capped when a node covers 1/3
// of the viewport.
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

    const maxZoomScale = Math.min(width, height) / NODE_BASE_SIZE / 3;
    const zoomScale = Math.min(xFactor, yFactor, maxZoomScale) * 0.8;

    const translateX = (width - ((xMax + xMin) * zoomScale)) / 2;
    const translateY = (height - ((yMax + yMin) * zoomScale)) / 2;

    return {
      zoomScale,
      maxZoomScale,
      minZoomScale: zoomScale / 5,
      panTranslateX: translateX + margins.left,
      panTranslateY: translateY + margins.top,
    };
  }
);

// Use the cache to get the last zoom state for the selected topology,
// otherwise use the default zoom options computed from the graph layout.
export const topologyZoomState = createSelector(
  [
    cachedZoomStateSelector,
    defaultZoomSelector,
  ],
  (cachedZoomState, defaultZoomState) => cachedZoomState || defaultZoomState
);
