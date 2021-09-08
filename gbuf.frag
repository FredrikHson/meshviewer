#version 440

out vec4 outcolor;
out vec4 outnormal;
in vec3 normal;
in vec4 position;
in vec3 vcolor;

void main()
{
    outcolor = vec4(vcolor, 1);
    outnormal = vec4(normalize(normal), position.z / position.w);
}
