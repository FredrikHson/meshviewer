#version 440

out vec4 outcolor;
out vec4 outnormal;
//out vec4 outpos;
in vec3 normal;
in vec4 worldposition;
in vec4 position;
uniform vec3 materialcolor = vec3(0.8, 0.8, 0.8);

void main()
{
    outcolor = vec4(materialcolor, 1);
    outnormal = vec4(normal, 1);
    //outpos = vec4(worldposition.xyz / worldposition.w,1);
}
