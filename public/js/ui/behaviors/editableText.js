import * as PIXI from "pixi.js";

/**
 * Attaches editable text behavior to a PIXI.Text object.
 * Creates a DOM input element overlay for editing.
 */
export function attachEditableText(app, textObject, onConfirm) {
    textObject.eventMode = 'static';
    textObject.cursor = 'pointer';

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 15;
    input.style.position = 'absolute';
    input.style.display = 'none';
    input.style.fontFamily = textObject.style.fontFamily;
    input.style.fontSize = `${textObject.style.fontSize}px`;
    input.style.color = new PIXI.Color(textObject.style.fill).toRgbaString();
    input.style.backgroundColor = 'rgba(0,0,0,0.5)';
    input.style.border = '1px solid #28ee28';
    document.body.appendChild(input);

    const confirmBtn = document.createElement('button');
    confirmBtn.innerHTML = '✔';
    confirmBtn.style.position = 'absolute';
    confirmBtn.style.display = 'none';
    document.body.appendChild(confirmBtn);

    const startEditing = () => {
        textObject.visible = false;
        input.style.display = 'block';
        confirmBtn.style.display = 'block';

        const bounds = textObject.getGlobalPosition();
        const scale = textObject.worldTransform.a;
        input.style.top = `${bounds.y}px`;
        input.style.left = `${bounds.x}px`;
        input.style.width = `${textObject.width / scale}px`;
        input.value = textObject.text;
        input.focus();

        confirmBtn.style.top = `${bounds.y}px`;
        confirmBtn.style.left = `${bounds.x + (textObject.width / scale) + 5}px`;
    };

    const stopEditing = () => {
        const newVal = input.value;
        textObject.text = newVal;
        textObject.visible = true;
        input.style.display = 'none';
        confirmBtn.style.display = 'none';

        if (typeof onConfirm === 'function') {
            onConfirm(newVal);
        }
    };

    textObject.on('pointertap', startEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            stopEditing();
        }
    });
    confirmBtn.addEventListener('click', stopEditing);
    input.addEventListener('blur', stopEditing);

    textObject.on('destroyed', () => {
        if (input.parentNode) {
            input.parentNode.removeChild(input);
        }
        if (confirmBtn.parentNode) {
            confirmBtn.parentNode.removeChild(confirmBtn);
        }
    });

    return {
        stopEditing,
        startEditing
    };
}
