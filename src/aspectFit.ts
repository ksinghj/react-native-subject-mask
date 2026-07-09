export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Where a `scaledToFit` image actually lands inside a container — i.e. the
 * letterboxed rect sharing the container's centre. The subject mask/outline
 * are in image space (normalized 0...1), so everything drawn over the photo
 * positions against this rect, not the container.
 */
export const aspectFitRect = (
  imageAspectRatio: number,
  container: { width: number; height: number }
): Rect => {
  if (imageAspectRatio <= 0 || container.width <= 0 || container.height <= 0) {
    return { x: 0, y: 0, width: container.width, height: container.height };
  }
  const containerAspect = container.width / container.height;
  let { width, height } = container;
  if (imageAspectRatio > containerAspect) {
    height = container.width / imageAspectRatio;
  } else {
    width = container.height * imageAspectRatio;
  }
  return {
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
    width,
    height,
  };
};
