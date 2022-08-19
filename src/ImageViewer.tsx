import React, { ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { IImageViewerData } from './types';

interface IProps {
  image: string;
  areaWidth: number;
  areaHeight: number;
  imageWidth: number;
  imageHeight: number;
  minScale: number;
  onMove: ({ positionX, positionY, scale }: IImageViewerData) => void;
  containerColor?: string;
  imageBackdropColor?: string;
  overlay?: ReactNode;
}

const defaultProps = {
  containerColor: 'black',
  imageBackdropColor: 'black',
  overlay: null,
};

const styles = StyleSheet.create({
  panGestureInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  imageWrapper: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  image: {},
});

const ImageViewer = ({
  image,
  imageWidth,
  imageHeight,
  areaWidth,
  areaHeight,
  containerColor,
  imageBackdropColor,
  overlay,
  minScale,
  onMove,
}: IProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(minScale);

  const timingDefaultParams = {
    duration: 200,
  };

  const maxScale = minScale + 100;

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const offsetZ = useSharedValue(minScale);

  const maxX = useSharedValue(0);
  const negMaxX = useSharedValue(0);

  const maxY = useSharedValue(0);
  const negMaxY = useSharedValue(0);

  const horizontalMax = useSharedValue(
    (imageWidth * offsetZ.value - areaWidth) / 2 / offsetZ.value,
  );

  const verticalMax = useSharedValue(
    (imageHeight * offsetZ.value - areaHeight) / 2 / offsetZ.value,
  );
  const scaledWidth = useSharedValue(imageWidth * scale.value);
  const scaledHeight = useSharedValue(imageHeight * scale.value);

  const TapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => {
      offsetZ.value = minScale;
      offsetX.value = 0;
      offsetY.value = 0;

      scale.value = withTiming(minScale, timingDefaultParams);
      translateX.value = withTiming(0, timingDefaultParams);
      translateY.value = withTiming(0, timingDefaultParams);
      onMove({
        positionX: offsetX.value,
        positionY: offsetY.value,
        scale: offsetZ.value,
      });
    });

  const PanGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .averageTouches(true)
    .minDistance(0)
    .onBegin(() => {
      maxX.value = horizontalMax.value;
      negMaxX.value = -horizontalMax.value;

      maxY.value = verticalMax.value;
      negMaxY.value = -verticalMax.value;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX / scale.value + offsetX.value;
      translateY.value = e.translationY / scale.value + offsetY.value;
    })
    .onEnd(() => {
      let newTranslateX = translateX.value;
      let newTranslateY = translateY.value;
      if (scaledWidth.value >= areaWidth) {
        if (translateX.value < negMaxX.value) {
          translateX.value = withTiming(negMaxX.value, timingDefaultParams);
          newTranslateX = negMaxX.value;
        } else if (translateX.value > maxX.value) {
          translateX.value = withTiming(maxX.value, timingDefaultParams);
          newTranslateX = maxX.value;
        }
      }

      if (scaledHeight.value >= areaHeight) {
        if (translateY.value < negMaxY.value) {
          translateY.value = withTiming(negMaxY.value, timingDefaultParams);
          newTranslateY = negMaxY.value;
        } else if (translateY.value > maxY.value) {
          translateY.value = withTiming(maxY.value, timingDefaultParams);
          newTranslateY = maxY.value;
        }
      }

      offsetX.value = newTranslateX;
      offsetY.value = newTranslateY;

      runOnJS(onMove)({
        positionX: offsetX.value,
        positionY: offsetY.value,
        scale: offsetZ.value,
      });
    });

  const PinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = offsetZ.value * e.scale;
    })
    .onEnd(() => {
      offsetZ.value = scale.value;

      if (scale.value > maxScale) {
        offsetZ.value = maxScale;
        scale.value = withTiming(maxScale, timingDefaultParams);
      }

      if (scale.value < minScale) {
        offsetZ.value = minScale;
        scale.value = withTiming(minScale, timingDefaultParams);
      }
      horizontalMax.value =
        (imageWidth * offsetZ.value - areaWidth) / 2 / offsetZ.value;
      verticalMax.value =
        (imageHeight * offsetZ.value - areaHeight) / 2 / offsetZ.value;
      scaledWidth.value = imageWidth * offsetZ.value;
      scaledHeight.value = imageHeight * offsetZ.value;

      maxX.value = horizontalMax.value;
      negMaxX.value = -horizontalMax.value;

      maxY.value = verticalMax.value;
      negMaxY.value = -verticalMax.value;
    });

  const imageSrc = {
    uri: image,
  };

  const containerStyles = [
    styles.panGestureInner,
    {
      backgroundColor: containerColor,
      width: areaWidth,
      height: areaHeight,
    },
  ];

  const areaStyles = {
    width: areaWidth,
    height: areaHeight,
    backgroundColor: imageBackdropColor,
  };

  const overlayContainerStyle = {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    height: areaHeight,
    width: areaWidth,
  };

  const imageWrapperStyles = [styles.imageWrapper, areaStyles];

  const imageStyles = useAnimatedStyle(() => ({
    width: imageWidth,
    height: imageHeight,
    transform: [
      {
        scale: scale.value,
      },
      {
        translateX: translateX.value,
      },
      {
        translateY: translateY.value,
      },
    ],
  }));

  useEffect(() => {
    onMove({
      positionX: translateX.value,
      positionY: translateY.value,
      scale: scale.value,
    });
  });

  const gesture = Gesture.Race(
    Gesture.Simultaneous(PinchGesture, PanGesture),
    TapGesture,
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={containerStyles}>
        <Animated.View style={areaStyles}>
          <Animated.View style={imageWrapperStyles} collapsable={false}>
            <Animated.Image
              style={[styles.image, imageStyles]}
              source={imageSrc}
            />
            {overlay && <View style={overlayContainerStyle}>{overlay}</View>}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

ImageViewer.defaultProps = defaultProps;

export default ImageViewer;
