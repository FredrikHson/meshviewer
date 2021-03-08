#version 440
in vec3 in_Position;
in vec3 in_Normal;
out vec4 position;
out vec3 normal;

uniform mat4 modelview;
uniform mat4 normalmodelview;
uniform mat4 persp;

void main(void)
{
    vec4 pos = persp *  modelview * vec4(in_Position, 1.0);
    gl_Position =  pos;
    position = pos.xyzw;
    normal =   in_Normal.xyz;
    //normal = mat3(normalmodelview) *  in_Normal.xyz;
    //normal = in_Normal;
}
