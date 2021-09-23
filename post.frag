#version 440
uniform sampler2D background;
out vec4 color;
in vec2 texcoord;
uniform float samples = 1;

// sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
const mat3 ACESInputMat =
{
    {0.59719, 0.07600, 0.02840},
    {0.35458, 0.90834, 0.13383},
    {0.04823, 0.01566, 0.83777}
};

// ODT_SAT => XYZ => D60_2_D65 => sRGB
const mat3 ACESOutputMat =
{
    { 1.60475, -0.10208, -0.00327},
    {-0.53108,  1.10813, -0.07276},
    {-0.07367, -0.00605,  1.07602}
};

vec3 RRTAndODTFit(vec3 v)
{
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
}

vec3 ACESFitted(vec3 color)
{
    //color = color * ACESInputMat;
    color =  ACESInputMat * color;
    // Apply RRT and ODT
    color = RRTAndODTFit(color);
    //color = color * ACESOutputMat ;
    color =  ACESOutputMat * color ;
    // Clamp to [0, 1]
    color = clamp(color, 0.0, 1.0);
    return color;
}

vec3 LinearTosRGB(vec3 color)
{
    vec3 x = color * 12.92;
    vec3 y = 1.055 * pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.4)) - 0.055;
    vec3 clr;
    clr.r = color.r < 0.0031308 ? x.r : y.r;
    clr.g = color.g < 0.0031308 ? x.g : y.g;
    clr.b = color.b < 0.0031308 ? x.b : y.b;
    return clr;
}

vec3 sRGBToLinear(vec3 color)
{
    vec3 x = color / 12.92;
    vec3 y = pow(clamp((color + 0.055f) * 1 / 1.055, 0.0, 1.0), vec3(2.4));
    vec3 clr;
    clr.r = x.r < 0.0031308 ? x.r : y.r;
    clr.g = x.g < 0.0031308 ? x.g : y.g;
    clr.b = x.b < 0.0031308 ? x.b : y.b;
    return  clr;
}

void main()
{
    vec4 incolor = texture(background, vec2(texcoord.x, texcoord.y)) / samples;
    color.xyz = LinearTosRGB(ACESFitted(incolor.xyz));
    color.w = incolor.w;
}
