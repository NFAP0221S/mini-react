module.exports = {
  presets: [
    ["@babel/preset-env"],
    ["@babel/preset-react", { runtime: "classic" }],
  ],
  plugins: [
    ["@babel/plugin-transform-react-jsx", {
      "pragma": "MyReact.createElement", // JSX를 MyReact.createElement로 변환합니다.
    }],
  ],
};
