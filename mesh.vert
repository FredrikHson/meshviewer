#version 440
in vec3 in_Position;
out vec4 v_position;
out vec4 v_worldposition;

uniform mat4 modelview;
uniform mat4 normalmodelview;
uniform mat4 persp;

void main(void)
{
    vec4 pos = persp *  modelview * vec4(in_Position, 1.0);
    gl_Position =  pos;
    v_worldposition = modelview * vec4(in_Position, 1.0);
    v_position = pos.xyzw;
    //normal = mat3(normalmodelview) *  in_Normal.xyz;
    //normal = in_Normal;
}
