import React, { PureComponent, ReactNode } from 'react';
import { Dimensions } from 'react-native';
import ImageSize from 'react-native-image-size';
import ImageViewer from './ImageViewer';
import {
  getPercentFromNumber,
  getPercentDiffNumberFromNumber,
} from './helpers/percentCalculator';
import {
  ICropperParams,
  ICropParams,
  IImageViewerData,
  ISizeData,
} from './types';

interface IProps {
  imageUri: string;
  cropAreaWidth?: number;
  cropAreaHeight?: number;
  containerColor?: string;
  areaColor?: string;
  areaOverlay?: ReactNode;
  setCropperParams: (params: ICropperParams) => void;
}

export interface IState {
  positionX: number;
  positionY: number;
  scale: number;
  minScale: number;
  srcSize: ISizeData;
  fittedSize: ISizeData;
  width: number;
  height: number;
  loading: boolean;
  prevImageUri: string;
}

const window = Dimensions.get('window');
const w = window.width;

const defaultProps = {
  cropAreaWidth: w,
  cropAreaHeight: w,
  containerColor: 'black',
  areaColor: 'black',
};

class ImageCropper extends PureComponent<IProps, IState> {
  static transformParams = async (params: ICropParams) => {
    const {
      positionX,
      positionY,
      scale,
      fittedSize,
      cropSize,
      cropAreaSize,
      imageUri,
    } = params;

    const realDimensions = await ImageSize.getSize(imageUri);

    if ([90, 270].includes(realDimensions.rotation || 0)) {
      const { width } = realDimensions;
      realDimensions.width = realDimensions.height;
      realDimensions.height = width;
    }

    const offset = {
      x: 0,
      y: 0,
    };

    const cropAreaW = cropAreaSize ? cropAreaSize.width : w;
    const cropAreaH = cropAreaSize ? cropAreaSize.height : w;

    const wScale = cropAreaW / scale;
    const hScale = cropAreaH / scale;

    const percentCropperAreaW = getPercentDiffNumberFromNumber(
      wScale,
      fittedSize.width,
    );
    const percentRestW = 100 - percentCropperAreaW;
    const hiddenAreaW = getPercentFromNumber(percentRestW, fittedSize.width);

    const percentCropperAreaH = getPercentDiffNumberFromNumber(
      hScale,
      fittedSize.height,
    );
    const percentRestH = 100 - percentCropperAreaH;
    const hiddenAreaH = getPercentFromNumber(percentRestH, fittedSize.height);

    const x = hiddenAreaW / 2 - positionX;
    const y = hiddenAreaH / 2 - positionY;

    offset.x = x <= 0 ? 0 : x;
    offset.y = y <= 0 ? 0 : y;

    const srcPercentCropperAreaW = getPercentDiffNumberFromNumber(
      offset.x,
      fittedSize.width,
    );
    const srcPercentCropperAreaH = getPercentDiffNumberFromNumber(
      offset.y,
      fittedSize.height,
    );

    const offsetW = getPercentFromNumber(
      srcPercentCropperAreaW,
      realDimensions.width,
    );
    const offsetH = getPercentFromNumber(
      srcPercentCropperAreaH,
      realDimensions.height,
    );

    const sizeW = getPercentFromNumber(
      percentCropperAreaW,
      realDimensions.width,
    );
    const sizeH = getPercentFromNumber(
      percentCropperAreaH,
      realDimensions.height,
    );

    offset.x = Math.floor(offsetW);
    offset.y = Math.floor(offsetH);

    const cropData = {
      offset,
      size: {
        width: Math.min(Math.round(sizeW), realDimensions.width - offset.x),
        height: Math.min(Math.round(sizeH), realDimensions.height - offset.y),
      },
      displaySize: {
        width: Math.round(cropSize.width),
        height: Math.round(cropSize.height),
      },
    };

    return cropData;
  };

  static defaultProps = defaultProps;

  static getDerivedStateFromProps(props: IProps, state: IState) {
    if (props.imageUri !== state.prevImageUri) {
      return {
        prevImageUri: props.imageUri,
        loading: true,
      };
    }

    return null;
  }

  state = {
    positionX: 0,
    positionY: 0,
    width: 0,
    height: 0,
    scale: 1,
    minScale: 1,
    loading: true,
    srcSize: {
      width: 0,
      height: 0,
    },
    fittedSize: {
      width: 0,
      height: 0,
    },
    prevImageUri: '',
  };

  componentDidMount() {
    this.init();
  }

  componentDidUpdate(prevProps: IProps) {
    const { imageUri, cropAreaHeight, cropAreaWidth } = this.props;
    if (
      imageUri &&
      prevProps.imageUri !== imageUri &&
      prevProps.cropAreaHeight !== cropAreaHeight &&
      prevProps.cropAreaWidth !== cropAreaWidth
    ) {
      this.init();
    }
  }

  init = async () => {
    const { imageUri } = this.props;
    const dimensions = await ImageSize.getSize(imageUri);

    if ([90, 270].includes(dimensions.rotation || 0)) {
      const { width } = dimensions;
      dimensions.width = dimensions.height;
      dimensions.height = width;
    }

    const { width, height } = dimensions;

    const { setCropperParams, cropAreaWidth, cropAreaHeight } = this.props;

    const areaWidth = cropAreaWidth!;
    const areaHeight = cropAreaHeight!;

    const srcSize = { width, height };
    const fittedSize = { width: 0, height: 0 };
    let scale = 1;

    if (width > height) {
      const ratio = w / height;
      fittedSize.width = width * ratio;
      fittedSize.height = w;
    } else if (width < height) {
      const ratio = w / width;
      fittedSize.width = w;
      fittedSize.height = height * ratio;
    } else if (width === height) {
      fittedSize.width = w;
      fittedSize.height = w;
    }

    if (areaWidth < areaHeight || areaWidth === areaHeight) {
      if (width < height) {
        if (fittedSize.height < areaHeight) {
          scale = Math.ceil((areaHeight / fittedSize.height) * 10) / 10;
        } else {
          scale = Math.ceil((areaWidth / fittedSize.width) * 10) / 10;
        }
      } else {
        scale = Math.ceil((areaHeight / fittedSize.height) * 10) / 10;
      }
    }

    scale = scale < 1 ? 1 : scale;

    this.setState(
      (prevState) => ({
        ...prevState,
        srcSize,
        fittedSize,
        minScale: scale,
        loading: false,
      }),
      () => {
        const { positionX, positionY } = this.state;

        setCropperParams({
          positionX,
          positionY,
          scale,
          srcSize,
          fittedSize,
        });
      },
    );
  };

  handleMove = ({ positionX, positionY, scale }: IImageViewerData) => {
    const { setCropperParams } = this.props;

    this.setState(
      (prevState) => ({
        ...prevState,
        positionX,
        positionY,
        scale,
      }),
      () => {
        const { srcSize, fittedSize } = this.state;

        setCropperParams({
          positionX,
          positionY,
          scale,
          srcSize,
          fittedSize,
        });
      },
    );
  };

  render() {
    const { loading, fittedSize, minScale } = this.state;
    const {
      imageUri,
      cropAreaWidth,
      cropAreaHeight,
      containerColor,
      areaColor,
      areaOverlay,
    } = this.props;

    const areaWidth = cropAreaWidth!;
    const areaHeight = cropAreaHeight!;

    const imageWidth = fittedSize.width;
    const imageHeight = fittedSize.height;

    return !loading ? (
      <ImageViewer
        image={imageUri}
        areaWidth={areaWidth}
        areaHeight={areaHeight}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        minScale={minScale}
        onMove={this.handleMove}
        containerColor={containerColor}
        imageBackdropColor={areaColor}
        overlay={areaOverlay}
      />
    ) : null;
  }
}

export default ImageCropper;
