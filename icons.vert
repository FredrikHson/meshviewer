#version 440
in vec3 in_Position;
in vec2 in_Uvs;
out vec2 texcoord;
out vec3 position;

uniform mat4 matrix;
uniform vec2 div;
uniform vec2 icon;
void main(void)
{
    gl_Position =  matrix*vec4(in_Position , 1.0);
    position = gl_Position.xyz;
    texcoord = vec2(in_Uvs.x, in_Uvs.y) / div;
    texcoord+=icon/div;
}
