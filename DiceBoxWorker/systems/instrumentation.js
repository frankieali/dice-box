import { EngineInstrumentation } from '@babylonjs/core/Instrumentation/engineInstrumentation'
import * as GUI from '@babylonjs/gui'

console.log(`GUI`, GUI)

function createInstrumentation(engine, scene) {
  // Instrumentation
  var instrumentation = new EngineInstrumentation(engine);
  instrumentation.captureGPUFrameTime = true;
  instrumentation.captureShaderCompilationTime = true;

  // GUI
  var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  var stackPanel = new GUI.StackPanel();
  stackPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;   
  stackPanel.isVertical = true;
  advancedTexture.addControl(stackPanel);     

  var text1 = new GUI.TextBlock();
  text1.text = "";
  text1.color = "black";
  text1.fontSize = 16;
  text1.height = "30px";
  stackPanel.addControl(text1);       

  var text2 = new GUI.TextBlock();
  text2.text = "";
  text2.color = "black";
  text2.fontSize = 16;
  text2.height = "30px";
  stackPanel.addControl(text2);       

  var text3 = new GUI.TextBlock();
  text3.text = "";
  text3.color = "black";
  text3.fontSize = 16;
  text3.height = "30px";
  stackPanel.addControl(text3);       

  var text4 = new GUI.TextBlock();
  text4.text = "";
  text4.color = "black";
  text4.fontSize = 16;
  text4.height = "30px";
  stackPanel.addControl(text4);        

  var text5 = new GUI.TextBlock();
  text5.text = "";
  text5.color = "black";
  text5.fontSize = 16;
  text5.height = "30px";
  stackPanel.addControl(text5);       

  var i = 0;
  scene.registerBeforeRender(function () {
    text1.text = "current frame time (GPU): " + (instrumentation.gpuFrameTimeCounter.current * 0.000001).toFixed(2) + "ms";
    text2.text = "average frame time (GPU): " + (instrumentation.gpuFrameTimeCounter.average * 0.000001).toFixed(2) + "ms";
    text3.text = "total shader compilation time: " + (instrumentation.shaderCompilationTimeCounter.total).toFixed(2) + "ms";
    text4.text = "average shader compilation time: " + (instrumentation.shaderCompilationTimeCounter.average).toFixed(2) + "ms";
    text5.text = "compiler shaders count: " + instrumentation.shaderCompilationTimeCounter.count;
  })
}

export { createInstrumentation }