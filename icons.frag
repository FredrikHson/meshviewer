#version 440
uniform sampler2D tex;
out vec4 color;
in vec2 texcoord;
uniform vec3 materialcolor;

void main()
{
    color = texture(tex, vec2(texcoord.x, 1 - texcoord.y));
    color.xyz *= materialcolor;
}
