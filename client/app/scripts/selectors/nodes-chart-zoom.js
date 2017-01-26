import { createSelector } from 'reselect';
import { NODE_BASE_SIZE } from '../constants/styles';


const viewportWidthSelector = createSelector(
  [
    (state, _) => state.width,
    (_, props) => props.margins.left,
    (_, props) => props.margins.right,
  ],
  (width, marginLeft, marginRight) => width - marginLeft - marginRight
);
const viewportHeightSelector = createSelector(
  [
    (state, _) => state.height,
    (_, props) => props.margins.top,
    (_, props) => props.margins.bottom,
  ],
  (height, marginTop, marginBottom) => height - marginTop - marginBottom
);

const defaultZoomSelector = createSelector(
  [
    (state, _) => state.nodes,
    viewportWidthSelector,
    viewportHeightSelector,
    (_, props) => props.margins.left,
    (_, props) => props.margins.top,
  ],
  (layoutNodes, width, height, marginLeft, marginTop) => {
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
      panTranslateX: translateX + marginLeft,
      panTranslateY: translateY + marginTop,
    };
  }
);

export const restoredZoomState = createSelector(
  [
    (state, props) => state.zoomCache[props.topologyId],
    defaultZoomSelector,
    (_, props) => props.topologyId,
  ],
  (cachedZoomState, defaultZoomState, topologyId) => {
    console.log(topologyId);
    console.log(cachedZoomState);
    return cachedZoomState || defaultZoomState;
  }
);
