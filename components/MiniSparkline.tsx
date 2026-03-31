import { View } from "react-native";

const SPARKLINE_DATA = [30, 35, 28, 42, 38, 50, 46, 55, 52, 60, 58, 65];

export function MiniSparkline({
  color,
  width = 100,
  height = 36,
}: {
  color: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...SPARKLINE_DATA);
  const min = Math.min(...SPARKLINE_DATA);
  const range = max - min || 1;
  const step = width / (SPARKLINE_DATA.length - 1);
  return (
    <View
      style={{ width, height, flexDirection: "row", alignItems: "flex-end" }}
    >
      {SPARKLINE_DATA.map((val, i) => {
        const h = ((val - min) / range) * (height - 4) + 4;
        return (
          <View
            key={i}
            style={{
              width: step - 1,
              height: h,
              marginRight: i < SPARKLINE_DATA.length - 1 ? 1 : 0,
              borderRadius: 2,
              backgroundColor:
                i >= SPARKLINE_DATA.length - 3 ? color : color + "40",
            }}
          />
        );
      })}
    </View>
  );
}
